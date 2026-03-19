package gateway

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// DeviceIdentity represents a persistent Ed25519 device identity used for
// authenticating with OpenClaw gateways in device mode. The identity is
// stored on disk as PEM-encoded keypair files and persists across restarts.
type DeviceIdentity struct {
	// DeviceID is the hex-encoded SHA-256 hash of the raw 32-byte public key.
	DeviceID string

	// PublicKey is the Ed25519 public key (32 bytes).
	PublicKey ed25519.PublicKey

	// PrivateKey is the Ed25519 private key (64 bytes).
	PrivateKey ed25519.PrivateKey
}

const (
	privateKeyFile = "private.pem"
	publicKeyFile  = "public.pem"
)

// LoadOrCreateIdentity loads an existing Ed25519 keypair from the specified
// directory, or generates a new one if none exists. The directory is created
// with mode 0700 if it does not exist. Key files are stored as PEM with
// mode 0600 (private) and 0644 (public).
func LoadOrCreateIdentity(dir string) (*DeviceIdentity, error) {
	privPath := filepath.Join(dir, privateKeyFile)
	pubPath := filepath.Join(dir, publicKeyFile)

	// Try to load existing identity.
	if _, err := os.Stat(privPath); err == nil {
		return loadIdentity(privPath, pubPath)
	}

	// Create directory if needed.
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, fmt.Errorf("create identity directory %s: %w", dir, err)
	}

	// Generate new Ed25519 keypair.
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("generate ed25519 keypair: %w", err)
	}

	// Save private key as PKCS8 PEM.
	privBytes, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		return nil, fmt.Errorf("marshal private key: %w", err)
	}
	privPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: privBytes,
	})
	if err := os.WriteFile(privPath, privPEM, 0600); err != nil {
		return nil, fmt.Errorf("write private key: %w", err)
	}

	// Save public key as PKIX PEM.
	pubBytes, err := x509.MarshalPKIXPublicKey(pub)
	if err != nil {
		return nil, fmt.Errorf("marshal public key: %w", err)
	}
	pubPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubBytes,
	})
	if err := os.WriteFile(pubPath, pubPEM, 0644); err != nil {
		return nil, fmt.Errorf("write public key: %w", err)
	}

	identity := &DeviceIdentity{
		DeviceID:   computeDeviceID(pub),
		PublicKey:   pub,
		PrivateKey:  priv,
	}

	slog.Info("generated new device identity",
		"device_id", identity.DeviceID,
		"key_dir", dir,
	)

	return identity, nil
}

// loadIdentity reads an existing Ed25519 keypair from PEM files on disk.
func loadIdentity(privPath, pubPath string) (*DeviceIdentity, error) {
	// Read and parse private key.
	privPEM, err := os.ReadFile(privPath)
	if err != nil {
		return nil, fmt.Errorf("read private key %s: %w", privPath, err)
	}
	block, _ := pem.Decode(privPEM)
	if block == nil {
		return nil, fmt.Errorf("decode private key PEM: no PEM block found in %s", privPath)
	}
	privKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse private key: %w", err)
	}
	edPriv, ok := privKey.(ed25519.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("private key is not Ed25519 (got %T)", privKey)
	}

	// Read and parse public key.
	pubPEM, err := os.ReadFile(pubPath)
	if err != nil {
		return nil, fmt.Errorf("read public key %s: %w", pubPath, err)
	}
	block, _ = pem.Decode(pubPEM)
	if block == nil {
		return nil, fmt.Errorf("decode public key PEM: no PEM block found in %s", pubPath)
	}
	pubKey, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse public key: %w", err)
	}
	edPub, ok := pubKey.(ed25519.PublicKey)
	if !ok {
		return nil, fmt.Errorf("public key is not Ed25519 (got %T)", pubKey)
	}

	identity := &DeviceIdentity{
		DeviceID:   computeDeviceID(edPub),
		PublicKey:   edPub,
		PrivateKey:  edPriv,
	}

	slog.Info("loaded existing device identity",
		"device_id", identity.DeviceID,
		"key_dir", filepath.Dir(privPath),
	)

	return identity, nil
}

// computeDeviceID derives the device ID from the raw 32-byte Ed25519 public key.
// The device ID is the hex-encoded SHA-256 hash of the raw public key bytes.
func computeDeviceID(pub ed25519.PublicKey) string {
	hash := sha256.Sum256([]byte(pub))
	return hex.EncodeToString(hash[:])
}

// Sign creates the device authentication fields for the OpenClaw connect
// handshake. It builds the v2 signature payload, signs it with the private
// key, and returns a map suitable for inclusion in the connect request's
// "device" field.
//
// Signature payload format (v2):
//
//	v2|<deviceId>|<clientId>|<clientMode>|<role>|<scopesCSV>|<signedAtMs>|<token>|<nonce>
func (d *DeviceIdentity) Sign(clientID, clientMode, role string, scopes []string, token, nonce string) map[string]interface{} {
	signedAtMs := time.Now().UnixMilli()
	scopesCSV := strings.Join(scopes, ",")

	payload := fmt.Sprintf("v2|%s|%s|%s|%s|%s|%d|%s|%s",
		d.DeviceID,
		clientID,
		clientMode,
		role,
		scopesCSV,
		signedAtMs,
		token,
		nonce,
	)

	signature := ed25519.Sign(d.PrivateKey, []byte(payload))

	result := map[string]interface{}{
		"id":        d.DeviceID,
		"publicKey": base64.RawURLEncoding.EncodeToString([]byte(d.PublicKey)),
		"signedAt":  signedAtMs,
		"signature": base64.RawURLEncoding.EncodeToString(signature),
	}
	// Always include nonce (gateway schema requires it).
	if nonce != "" {
		result["nonce"] = nonce
	} else {
		result["nonce"] = nil
	}
	return result
}
