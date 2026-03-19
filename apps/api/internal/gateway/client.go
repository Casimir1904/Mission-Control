package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	// rpcTimeout is the default timeout for RPC calls.
	rpcTimeout = 30 * time.Second

	// pingInterval is how often the client sends WebSocket pings.
	pingInterval = 30 * time.Second

	// pongTimeout is the deadline for receiving a pong after a ping.
	pongTimeout = 10 * time.Second

	// eventChannelSize is the buffer size for the incoming events channel.
	eventChannelSize = 256

	// reconnectBaseDelay is the initial backoff delay for reconnection.
	reconnectBaseDelay = 1 * time.Second

	// reconnectMaxDelay is the maximum backoff delay for reconnection.
	reconnectMaxDelay = 30 * time.Second

	// protocolVersion is the OpenClaw protocol version we support.
	protocolVersion = 3
)

// RPCRequest is a JSON-RPC request sent to the gateway.
// OpenClaw requires a "type" field set to "req" for all requests.
type RPCRequest struct {
	Type   string      `json:"type"`
	ID     string      `json:"id"`
	Method string      `json:"method"`
	Params interface{} `json:"params,omitempty"`
}

// RPCResponse is a JSON-RPC response from the gateway.
// OpenClaw messages include a "type" field: "res" for responses, "event" for events.
type RPCResponse struct {
	Type    string          `json:"type,omitempty"`
	ID      string          `json:"id,omitempty"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *RPCError       `json:"error,omitempty"`
	Event   string          `json:"event,omitempty"`
	Payload json.RawMessage `json:"payload,omitempty"`
	Data    json.RawMessage `json:"data,omitempty"`
}

// RPCError is the error payload inside an RPC response.
// OpenClaw may send code as either int or string, so we use json.RawMessage.
type RPCError struct {
	Message string          `json:"message"`
	Code    json.RawMessage `json:"code,omitempty"`
}

// Error implements the error interface.
func (e *RPCError) Error() string {
	return fmt.Sprintf("rpc error %s: %s", string(e.Code), e.Message)
}

// GatewayEvent is a server-pushed event from the gateway.
type GatewayEvent struct {
	Type string          `json:"event"`
	Data json.RawMessage `json:"data"`
}

// connectPayload is the authentication handshake sent after WebSocket upgrade.
type connectPayload struct {
	MinProtocol int            `json:"minProtocol"`
	MaxProtocol int            `json:"maxProtocol"`
	Role        string         `json:"role"`
	Scopes      []string       `json:"scopes"`
	Client      connectClient  `json:"client"`
	Auth        connectAuth    `json:"auth"`
}

type connectClient struct {
	ID       string `json:"id"`
	Version  string `json:"version"`
	Platform string `json:"platform"`
	Mode     string `json:"mode"`
}

type connectAuth struct {
	Token string `json:"token"`
}

// Client is a resilient WebSocket JSON-RPC client for an OpenClaw gateway.
type Client struct {
	url       string
	token     string
	identity  *DeviceIdentity
	conn      *websocket.Conn
	callbacks map[string]chan *RPCResponse
	eventCh   chan *GatewayEvent
	mu        sync.RWMutex
	logger    *slog.Logger
	connected atomic.Bool
	done      chan struct{}
	cancel    context.CancelFunc
}

// NewClient creates a new gateway client. Call Connect to establish the connection.
// If identity is non-nil, the client authenticates in device mode (required for
// non-localhost connections). If nil, it falls back to control_ui mode (localhost only).
func NewClient(url, token string, identity *DeviceIdentity, logger *slog.Logger) *Client {
	if logger == nil {
		logger = slog.Default()
	}
	mode := "device"
	if identity == nil {
		mode = "control_ui (fallback)"
	}
	return &Client{
		url:       url,
		token:     token,
		identity:  identity,
		callbacks: make(map[string]chan *RPCResponse),
		eventCh:   make(chan *GatewayEvent, eventChannelSize),
		logger:    logger.With("component", "gateway-client", "url", url, "auth_mode", mode),
		done:      make(chan struct{}),
	}
}

// Connect establishes the WebSocket connection, performs the auth handshake,
// and starts the read loop and keepalive goroutines. It also starts a
// reconnection goroutine that will attempt to restore the connection if it drops.
func (c *Client) Connect(ctx context.Context) error {
	if err := c.connect(ctx); err != nil {
		return err
	}

	// Create a cancellable context for background goroutines.
	bgCtx, cancel := context.WithCancel(ctx)
	c.cancel = cancel

	go c.readLoop(bgCtx)
	// Note: OpenClaw does not support WebSocket-level pings.
	// The Python client sets ping_interval=None. Skip keepAlive.
	go c.reconnectLoop(bgCtx)

	return nil
}

// connect performs a single connection attempt: dial + auth handshake.
func (c *Client) connect(ctx context.Context) error {
	c.logger.Info("connecting to gateway")

	dialer := websocket.DefaultDialer

	// Set Origin header to match the gateway URL (HTTP scheme, required for control_ui mode).
	// Convert ws:// to http:// and wss:// to https:// for the Origin header.
	origin := c.url
	if len(origin) > 5 && origin[:5] == "ws://" {
		origin = "http://" + origin[5:]
	} else if len(origin) > 6 && origin[:6] == "wss://" {
		origin = "https://" + origin[6:]
	}
	headers := make(map[string][]string)
	headers["Origin"] = []string{origin}
	conn, _, err := dialer.DialContext(ctx, c.url, headers)
	if err != nil {
		return fmt.Errorf("gateway websocket dial: %w", err)
	}

	c.mu.Lock()
	c.conn = conn
	c.mu.Unlock()

	// Wait for challenge event from gateway, then authenticate.
	if err := c.authenticate(ctx); err != nil {
		conn.Close()
		c.mu.Lock()
		c.conn = nil
		c.mu.Unlock()
		return fmt.Errorf("gateway authenticate: %w", err)
	}

	c.connected.Store(true)
	c.logger.Info("connected and authenticated to gateway")
	return nil
}

// authenticate performs the OpenClaw auth handshake.
// 1. Read the challenge event from the gateway (optional — may timeout).
// 2. Send the connect RPC request with our credentials.
// 3. Wait for the connect response.
func (c *Client) authenticate(ctx context.Context) error {
	// Step 1: Try to read the challenge event (gateway may or may not send one).
	c.conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg, err := c.conn.ReadMessage()
	c.conn.SetReadDeadline(time.Time{}) // Clear deadline.

	var connectNonce string
	if err == nil {
		c.logger.Debug("received message from gateway", "message", string(msg))
		// Parse challenge to extract nonce if present.
		var challenge struct {
			Type    string `json:"type"`
			Event   string `json:"event"`
			Payload struct {
				Nonce string `json:"nonce"`
			} `json:"payload"`
		}
		if json.Unmarshal(msg, &challenge) == nil &&
			challenge.Type == "event" && challenge.Event == "connect.challenge" {
			connectNonce = challenge.Payload.Nonce
			c.logger.Debug("received connect challenge", "nonce", connectNonce)
		}
	}
	// Timeout reading challenge is OK — not all gateways send one.

	// Step 2: Build the connect RPC request.
	// Use device mode with Ed25519 identity when available (required for
	// non-localhost connections). Fall back to control_ui mode otherwise.
	role := "operator"
	scopes := []string{"operator.read", "operator.admin", "operator.approvals", "operator.pairing"}

	clientID := "gateway-client"
	clientMode := "backend"
	if c.identity == nil {
		// Fallback for localhost-only connections.
		clientID = "openclaw-control-ui"
		clientMode = "ui"
	}

	connectID := uuid.New().String()
	params := map[string]interface{}{
		"minProtocol": protocolVersion,
		"maxProtocol": protocolVersion,
		"role":        role,
		"scopes":      scopes,
		"client": map[string]string{
			"id":       clientID,
			"version":  "1.0.0",
			"platform": "go",
			"mode":     clientMode,
		},
		"auth": map[string]string{
			"token": c.token,
		},
	}

	// Add device identity block for cryptographic authentication.
	if c.identity != nil {
		params["device"] = c.identity.Sign(clientID, clientMode, role, scopes, c.token, connectNonce)
		c.logger.Debug("authenticating with device identity", "device_id", c.identity.DeviceID)
	}

	connectReq := map[string]interface{}{
		"type":   "req",
		"id":     connectID,
		"method": "connect",
		"params": params,
	}

	connectJSON, err := json.Marshal(connectReq)
	if err != nil {
		return fmt.Errorf("marshal connect request: %w", err)
	}
	c.logger.Debug("sending connect request", "payload_size", len(connectJSON))

	if err := c.conn.WriteMessage(websocket.TextMessage, connectJSON); err != nil {
		return fmt.Errorf("send connect request: %w", err)
	}

	// Step 3: Wait for the connect response.
	c.conn.SetReadDeadline(time.Now().Add(10 * time.Second))
	_, respMsg, err := c.conn.ReadMessage()
	c.conn.SetReadDeadline(time.Time{})
	if err != nil {
		return fmt.Errorf("read connect response: %w", err)
	}

	var resp RPCResponse
	if err := json.Unmarshal(respMsg, &resp); err != nil {
		return fmt.Errorf("unmarshal connect response: %w", err)
	}
	if resp.Error != nil {
		return fmt.Errorf("connect rejected: %s", resp.Error.Message)
	}

	c.logger.Debug("connect response received", "id", resp.ID)
	return nil
}

// Close cleanly shuts down the client, stopping all goroutines and closing the WebSocket.
func (c *Client) Close() error {
	if c.cancel != nil {
		c.cancel()
	}

	c.connected.Store(false)

	c.mu.Lock()
	conn := c.conn
	c.conn = nil

	// Fail all pending callbacks.
	for id, ch := range c.callbacks {
		ch <- &RPCResponse{
			ID:    id,
			Error: &RPCError{Message: "client closed", Code: json.RawMessage(`-1`)},
		}
		delete(c.callbacks, id)
	}
	c.mu.Unlock()

	if conn != nil {
		return conn.Close()
	}
	return nil
}

// Call sends an RPC request and waits for the response.
// It returns the result payload on success, or an error (including RPCError).
func (c *Client) Call(ctx context.Context, method string, params interface{}) (json.RawMessage, error) {
	if !c.connected.Load() {
		return nil, fmt.Errorf("gateway client not connected")
	}

	reqID := uuid.New().String()
	req := RPCRequest{
		Type:   "req",
		ID:     reqID,
		Method: method,
		Params: params,
	}

	// Register the callback channel before sending.
	respCh := make(chan *RPCResponse, 1)
	c.mu.Lock()
	c.callbacks[reqID] = respCh
	c.mu.Unlock()

	// Ensure cleanup on all exit paths.
	defer func() {
		c.mu.Lock()
		delete(c.callbacks, reqID)
		c.mu.Unlock()
	}()

	// Send the request.
	c.mu.RLock()
	conn := c.conn
	c.mu.RUnlock()
	if conn == nil {
		return nil, fmt.Errorf("gateway client not connected")
	}

	c.logger.Debug("sending rpc request", "method", method, "id", reqID)
	if err := conn.WriteJSON(req); err != nil {
		return nil, fmt.Errorf("send rpc request: %w", err)
	}

	// Wait for the response with timeout.
	callCtx, callCancel := context.WithTimeout(ctx, rpcTimeout)
	defer callCancel()

	select {
	case resp := <-respCh:
		if resp.Error != nil {
			return nil, resp.Error
		}
		// OpenClaw may use "result" or "payload" for the response data.
		data := resp.Result
		if len(data) == 0 {
			data = resp.Payload
		}
		c.logger.Debug("rpc response received", "method", method, "data_len", len(data))
		return data, nil
	case <-callCtx.Done():
		return nil, fmt.Errorf("rpc call %s timed out", method)
	}
}

// Events returns a read-only channel that receives gateway-pushed events.
func (c *Client) Events() <-chan *GatewayEvent {
	return c.eventCh
}

// IsConnected returns whether the client has an active WebSocket connection.
func (c *Client) IsConnected() bool {
	return c.connected.Load()
}

// readLoop continuously reads messages from the WebSocket and routes them
// to either the appropriate RPC callback or the events channel.
func (c *Client) readLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		c.mu.RLock()
		conn := c.conn
		c.mu.RUnlock()
		if conn == nil {
			return
		}

		_, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				c.logger.Info("gateway connection closed normally")
			} else {
				c.logger.Warn("gateway read error", "error", err)
			}
			c.connected.Store(false)
			return
		}

		var resp RPCResponse
		if err := json.Unmarshal(msg, &resp); err != nil {
			c.logger.Warn("failed to unmarshal gateway message", "error", err, "raw", string(msg))
			continue
		}

		// If the message is an event (type="event" or has an Event field).
		if resp.Type == "event" || resp.Event != "" {
			eventData := resp.Payload
			if eventData == nil {
				eventData = resp.Data
			}
			event := &GatewayEvent{
				Type: resp.Event,
				Data: eventData,
			}
			select {
			case c.eventCh <- event:
			default:
				c.logger.Warn("gateway event channel full, dropping event", "type", resp.Event)
			}
			continue
		}

		// Otherwise, it is an RPC response. Route to the matching callback.
		if resp.ID != "" {
			c.mu.RLock()
			ch, ok := c.callbacks[resp.ID]
			c.mu.RUnlock()
			if ok {
				ch <- &resp
			} else {
				c.logger.Warn("received rpc response for unknown request", "id", resp.ID)
			}
		}
	}
}

// keepAlive sends periodic WebSocket pings to detect dead connections.
func (c *Client) keepAlive(ctx context.Context) {
	ticker := time.NewTicker(pingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.mu.RLock()
			conn := c.conn
			c.mu.RUnlock()
			if conn == nil {
				return
			}

			if err := conn.WriteControl(
				websocket.PingMessage,
				nil,
				time.Now().Add(pongTimeout),
			); err != nil {
				c.logger.Warn("gateway ping failed", "error", err)
				c.connected.Store(false)
				return
			}
		}
	}
}

// reconnectLoop watches for disconnection and attempts to restore the connection
// with exponential backoff.
func (c *Client) reconnectLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		// Wait until we are disconnected.
		if c.connected.Load() {
			time.Sleep(1 * time.Second)
			continue
		}

		// Only reconnect if the context is still active (not shutting down).
		if ctx.Err() != nil {
			return
		}

		c.logger.Info("gateway disconnected, starting reconnection attempts")

		attempt := 0
		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			delay := time.Duration(math.Min(
				float64(reconnectBaseDelay)*math.Pow(2, float64(attempt)),
				float64(reconnectMaxDelay),
			))
			c.logger.Info("reconnecting to gateway", "attempt", attempt+1, "delay", delay)

			select {
			case <-ctx.Done():
				return
			case <-time.After(delay):
			}

			if err := c.connect(ctx); err != nil {
				c.logger.Warn("gateway reconnect failed", "attempt", attempt+1, "error", err)
				attempt++
				continue
			}

			// Successfully reconnected. Restart the read loop.
			go c.readLoop(ctx)

			c.logger.Info("gateway reconnected successfully", "attempt", attempt+1)
			break
		}
	}
}
