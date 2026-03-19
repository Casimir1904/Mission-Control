package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 4096
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, validate against ALLOWED_ORIGINS.
		return true
	},
}

// Message represents a WebSocket message with topic routing.
type Message struct {
	Topic   string         `json:"topic"`
	Type    string         `json:"type"`
	Payload map[string]any `json:"payload,omitempty"`
}

// Connection represents a single WebSocket client connection.
type Connection struct {
	ID     string
	conn   *websocket.Conn
	send   chan []byte
	topics map[string]bool
	mu     sync.RWMutex
}

// Hub manages WebSocket connections and topic-based message routing.
type Hub struct {
	// Registered connections.
	connections map[string]*Connection

	// Topic to connection mapping.
	topics map[string]map[string]*Connection

	// Register requests from connections.
	register chan *Connection

	// Unregister requests from connections.
	unregister chan *Connection

	// Subscribe requests.
	subscribe chan subscribeRequest

	// Unsubscribe requests.
	unsubscribeReq chan subscribeRequest

	// Broadcast messages to a topic.
	broadcast chan topicMessage

	mu sync.RWMutex
}

type subscribeRequest struct {
	connID string
	topic  string
}

type topicMessage struct {
	topic string
	data  []byte
}

// NewHub creates a new WebSocket Hub.
func NewHub() *Hub {
	return &Hub{
		connections:    make(map[string]*Connection),
		topics:         make(map[string]map[string]*Connection),
		register:       make(chan *Connection, 64),
		unregister:     make(chan *Connection, 64),
		subscribe:      make(chan subscribeRequest, 64),
		unsubscribeReq: make(chan subscribeRequest, 64),
		broadcast:      make(chan topicMessage, 256),
	}
}

// Run starts the hub's event loop. It should be run in a goroutine.
func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			h.mu.Lock()
			for _, conn := range h.connections {
				close(conn.send)
			}
			h.connections = make(map[string]*Connection)
			h.topics = make(map[string]map[string]*Connection)
			h.mu.Unlock()
			return

		case conn := <-h.register:
			h.mu.Lock()
			h.connections[conn.ID] = conn
			h.mu.Unlock()
			slog.Debug("ws connection registered", "conn_id", conn.ID)

		case conn := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.connections[conn.ID]; ok {
				delete(h.connections, conn.ID)
				close(conn.send)

				// Remove from all topics.
				for topic, conns := range h.topics {
					delete(conns, conn.ID)
					if len(conns) == 0 {
						delete(h.topics, topic)
					}
				}
			}
			h.mu.Unlock()
			slog.Debug("ws connection unregistered", "conn_id", conn.ID)

		case req := <-h.subscribe:
			h.mu.Lock()
			if _, ok := h.topics[req.topic]; !ok {
				h.topics[req.topic] = make(map[string]*Connection)
			}
			if conn, ok := h.connections[req.connID]; ok {
				h.topics[req.topic][req.connID] = conn
				conn.mu.Lock()
				conn.topics[req.topic] = true
				conn.mu.Unlock()
			}
			h.mu.Unlock()

		case req := <-h.unsubscribeReq:
			h.mu.Lock()
			if conns, ok := h.topics[req.topic]; ok {
				delete(conns, req.connID)
				if len(conns) == 0 {
					delete(h.topics, req.topic)
				}
			}
			if conn, ok := h.connections[req.connID]; ok {
				conn.mu.Lock()
				delete(conn.topics, req.topic)
				conn.mu.Unlock()
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			h.mu.RLock()
			if conns, ok := h.topics[msg.topic]; ok {
				for _, conn := range conns {
					select {
					case conn.send <- msg.data:
					default:
						// Buffer full, skip this connection.
						slog.Warn("ws send buffer full, dropping message",
							"conn_id", conn.ID,
							"topic", msg.topic,
						)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastToTopic sends a message to all connections subscribed to the given topic.
func (h *Hub) BroadcastToTopic(topic string, msg *Message) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	h.broadcast <- topicMessage{topic: topic, data: data}
	return nil
}

// SendToConnection sends a message to a specific connection by ID.
func (h *Hub) SendToConnection(connID string, msg *Message) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	h.mu.RLock()
	conn, ok := h.connections[connID]
	h.mu.RUnlock()

	if !ok {
		return nil // Connection not found, silently ignore.
	}

	select {
	case conn.send <- data:
	default:
		slog.Warn("ws send buffer full", "conn_id", connID)
	}
	return nil
}

// UpgradeHandler returns an HTTP handler that upgrades connections to WebSocket.
func UpgradeHandler(hub *Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wsConn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			slog.Error("ws upgrade failed", "error", err)
			return
		}

		conn := &Connection{
			ID:     uuid.New().String(),
			conn:   wsConn,
			send:   make(chan []byte, 256),
			topics: make(map[string]bool),
		}

		hub.register <- conn

		go conn.writePump()
		go conn.readPump(hub)
	}
}

// readPump pumps messages from the WebSocket connection to the hub.
func (c *Connection) readPump(hub *Hub) {
	defer func() {
		hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				slog.Warn("ws unexpected close", "conn_id", c.ID, "error", err)
			}
			return
		}

		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			slog.Debug("ws invalid message", "conn_id", c.ID, "error", err)
			continue
		}

		switch msg.Type {
		case "subscribe":
			hub.subscribe <- subscribeRequest{connID: c.ID, topic: msg.Topic}
		case "unsubscribe":
			hub.unsubscribeReq <- subscribeRequest{connID: c.ID, topic: msg.Topic}
		default:
			slog.Debug("ws unknown message type", "conn_id", c.ID, "type", msg.Type)
		}
	}
}

// writePump pumps messages from the hub to the WebSocket connection.
func (c *Connection) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
