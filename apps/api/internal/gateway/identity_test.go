package gateway_test

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/gateway"
)

// TestLoadOrCreateIdentity_CreatesNewKeypair verifies that a new identity
// is generated when the directory is empty.
func TestLoadOrCreateIdentity_CreatesNewKeypair(t *testing.T) {
	dir := t.TempDir()

	identity, err := gateway.LoadOrCreateIdentity(dir)
	if err != nil {
		t.Fatalf("LoadOrCreateIdentity() error = %v", err)
	}

	if identity == nil {
		t.Fatal("identity should not be nil")
	}

	// DeviceID should be a 64-character hex string (SHA-256 hash).
	if len(identity.DeviceID) != 64 {
		t.Errorf("DeviceID length = %d, want 64", len(identity.DeviceID))
	}
	// Verify it's valid hex.
	if _, err := hex.DecodeString(identity.DeviceID); err != nil {
		t.Errorf("DeviceID is not valid hex: %v", err)
	}

	// Key sizes should be correct for Ed25519.
	if len(identity.PublicKey) != ed25519.PublicKeySize {
		t.Errorf("PublicKey size = %d, want %d", len(identity.PublicKey), ed25519.PublicKeySize)
	}
	if len(identity.PrivateKey) != ed25519.PrivateKeySize {
		t.Errorf("PrivateKey size = %d, want %d", len(identity.PrivateKey), ed25519.PrivateKeySize)
	}

	// PEM files should exist on disk.
	if _, err := os.Stat(filepath.Join(dir, "private.pem")); os.IsNotExist(err) {
		t.Error("private.pem was not created")
	}
	if _, err := os.Stat(filepath.Join(dir, "public.pem")); os.IsNotExist(err) {
		t.Error("public.pem was not created")
	}
}

// TestLoadOrCreateIdentity_LoadsExistingKeypair verifies that calling
// LoadOrCreateIdentity twice on the same directory returns the same identity.
func TestLoadOrCreateIdentity_LoadsExistingKeypair(t *testing.T) {
	dir := t.TempDir()

	first, err := gateway.LoadOrCreateIdentity(dir)
	if err != nil {
		t.Fatalf("first LoadOrCreateIdentity() error = %v", err)
	}

	second, err := gateway.LoadOrCreateIdentity(dir)
	if err != nil {
		t.Fatalf("second LoadOrCreateIdentity() error = %v", err)
	}

	if first.DeviceID != second.DeviceID {
		t.Errorf("DeviceID mismatch: first = %q, second = %q", first.DeviceID, second.DeviceID)
	}
	if !first.PublicKey.Equal(second.PublicKey) {
		t.Error("PublicKey mismatch between first and second load")
	}
	if !first.PrivateKey.Equal(second.PrivateKey) {
		t.Error("PrivateKey mismatch between first and second load")
	}
}

// TestDeviceID_Deterministic verifies that the DeviceID is deterministically
// derived from the public key (SHA-256 hash).
func TestDeviceID_Deterministic(t *testing.T) {
	dir := t.TempDir()

	identity, err := gateway.LoadOrCreateIdentity(dir)
	if err != nil {
		t.Fatalf("LoadOrCreateIdentity() error = %v", err)
	}

	// Manually compute expected device ID: hex(SHA-256(publicKey)).
	hash := sha256.Sum256([]byte(identity.PublicKey))
	expected := hex.EncodeToString(hash[:])

	if identity.DeviceID != expected {
		t.Errorf("DeviceID = %q, want %q (SHA-256 of public key)", identity.DeviceID, expected)
	}
}

// TestSign_ProducesValidSignature verifies that the Sign method produces
// an Ed25519 signature that can be verified with the public key.
func TestSign_ProducesValidSignature(t *testing.T) {
	dir := t.TempDir()

	identity, err := gateway.LoadOrCreateIdentity(dir)
	if err != nil {
		t.Fatalf("LoadOrCreateIdentity() error = %v", err)
	}

	result := identity.Sign(
		"client-123",
		"agent",
		"lead",
		[]string{"board:read", "board:write"},
		"token-abc",
		"nonce-xyz",
	)

	// Verify required fields exist.
	requiredKeys := []string{"id", "publicKey", "signedAt", "signature", "nonce"}
	for _, key := range requiredKeys {
		if _, ok := result[key]; !ok {
			t.Errorf("result missing key %q", key)
		}
	}

	// Verify id matches device ID.
	if result["id"] != identity.DeviceID {
		t.Errorf("result[id] = %v, want %q", result["id"], identity.DeviceID)
	}

	// Verify nonce is passed through.
	if result["nonce"] != "nonce-xyz" {
		t.Errorf("result[nonce] = %v, want %q", result["nonce"], "nonce-xyz")
	}

	// Verify signedAt is a positive int64.
	signedAt, ok := result["signedAt"].(int64)
	if !ok {
		t.Fatalf("signedAt is not int64, got %T", result["signedAt"])
	}
	if signedAt <= 0 {
		t.Errorf("signedAt = %d, want positive", signedAt)
	}

	// Decode signature and verify it is 64 bytes (Ed25519 signature size).
	sigB64, ok := result["signature"].(string)
	if !ok {
		t.Fatalf("signature is not string, got %T", result["signature"])
	}
	sigBytes, err := base64.RawURLEncoding.DecodeString(sigB64)
	if err != nil {
		t.Fatalf("failed to decode signature: %v", err)
	}
	if len(sigBytes) != ed25519.SignatureSize {
		t.Errorf("signature size = %d, want %d", len(sigBytes), ed25519.SignatureSize)
	}

	// Reconstruct the exact v2 payload and verify the signature.
	scopesCSV := "board:read,board:write"
	payload := fmt.Sprintf("v2|%s|client-123|agent|lead|%s|%d|token-abc|nonce-xyz",
		identity.DeviceID, scopesCSV, signedAt)
	if !ed25519.Verify(identity.PublicKey, []byte(payload), sigBytes) {
		t.Error("Ed25519 signature verification failed")
	}
}

// TestSign_PayloadFormatV2 verifies the v2 payload format by checking the
// signature is verifiable against the reconstructed payload.
func TestSign_PayloadFormatV2(t *testing.T) {
	dir := t.TempDir()

	identity, err := gateway.LoadOrCreateIdentity(dir)
	if err != nil {
		t.Fatalf("LoadOrCreateIdentity() error = %v", err)
	}

	clientID := "test-client"
	clientMode := "agent"
	role := "worker"
	scopes := []string{"read", "write"}
	token := "test-token"
	nonce := "test-nonce"

	result := identity.Sign(clientID, clientMode, role, scopes, token, nonce)

	signedAt := result["signedAt"].(int64)
	sigB64 := result["signature"].(string)
	sigBytes, _ := base64.RawURLEncoding.DecodeString(sigB64)

	// Reconstruct exact v2 payload.
	payload := "v2|" + identity.DeviceID +
		"|" + clientID +
		"|" + clientMode +
		"|" + role +
		"|" + strings.Join(scopes, ",") +
		"|" + intToString(signedAt) +
		"|" + token +
		"|" + nonce

	// Verify the Ed25519 signature against the reconstructed payload.
	if !ed25519.Verify(identity.PublicKey, []byte(payload), sigBytes) {
		t.Error("signature verification failed: payload format may not match v2 spec")
	}
}

// TestSign_EmptyNonce verifies that an empty nonce results in nil nonce value.
func TestSign_EmptyNonce(t *testing.T) {
	dir := t.TempDir()

	identity, err := gateway.LoadOrCreateIdentity(dir)
	if err != nil {
		t.Fatalf("LoadOrCreateIdentity() error = %v", err)
	}

	result := identity.Sign("client", "agent", "lead", nil, "token", "")

	if result["nonce"] != nil {
		t.Errorf("result[nonce] = %v, want nil for empty nonce", result["nonce"])
	}
}

// TestSign_PublicKeyEncoding verifies the public key is base64 raw URL encoded.
func TestSign_PublicKeyEncoding(t *testing.T) {
	dir := t.TempDir()

	identity, err := gateway.LoadOrCreateIdentity(dir)
	if err != nil {
		t.Fatalf("LoadOrCreateIdentity() error = %v", err)
	}

	result := identity.Sign("client", "agent", "lead", nil, "token", "nonce")

	pubKeyB64, ok := result["publicKey"].(string)
	if !ok {
		t.Fatalf("publicKey is not string, got %T", result["publicKey"])
	}

	decoded, err := base64.RawURLEncoding.DecodeString(pubKeyB64)
	if err != nil {
		t.Fatalf("failed to decode publicKey: %v", err)
	}

	if len(decoded) != ed25519.PublicKeySize {
		t.Errorf("decoded publicKey size = %d, want %d", len(decoded), ed25519.PublicKeySize)
	}
}

// TestLoadOrCreateIdentity_CreatesDirectory verifies that LoadOrCreateIdentity
// creates the directory if it does not exist.
func TestLoadOrCreateIdentity_CreatesDirectory(t *testing.T) {
	base := t.TempDir()
	dir := filepath.Join(base, "nested", "identity")

	_, err := gateway.LoadOrCreateIdentity(dir)
	if err != nil {
		t.Fatalf("LoadOrCreateIdentity() error = %v", err)
	}

	info, err := os.Stat(dir)
	if err != nil {
		t.Fatalf("directory not created: %v", err)
	}
	if !info.IsDir() {
		t.Error("path is not a directory")
	}
}

// TestLoadOrCreateIdentity_DifferentDirs_DifferentIDs verifies that two
// different directories produce different identities.
func TestLoadOrCreateIdentity_DifferentDirs_DifferentIDs(t *testing.T) {
	dir1 := t.TempDir()
	dir2 := t.TempDir()

	id1, err := gateway.LoadOrCreateIdentity(dir1)
	if err != nil {
		t.Fatalf("first LoadOrCreateIdentity() error = %v", err)
	}

	id2, err := gateway.LoadOrCreateIdentity(dir2)
	if err != nil {
		t.Fatalf("second LoadOrCreateIdentity() error = %v", err)
	}

	if id1.DeviceID == id2.DeviceID {
		t.Error("two different directories should produce different device IDs")
	}
}

// intToString converts an int64 to its decimal string representation.
func intToString(n int64) string {
	return fmt.Sprintf("%d", n)
}
