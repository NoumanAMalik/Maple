package collab

import (
	"errors"
	"unicode/utf16"
)

const (
	OpInsert = "insert"
	OpDelete = "delete"
)

var ErrResyncRequired = errors.New("resync required")

type Operation struct {
	Type string `json:"type"`
	Pos  int    `json:"pos"`
	Text string `json:"text,omitempty"`
	Len  int    `json:"len,omitempty"`
}

type OpMessage struct {
	V           int         `json:"v"`
	T           string      `json:"t"`
	OpID        string      `json:"opId"`
	BaseVersion int         `json:"baseVersion"`
	Ops         []Operation `json:"ops"`
	Presence    *Presence   `json:"presence,omitempty"`
}

type AckMessage struct {
	V          int    `json:"v"`
	T          string `json:"t"`
	OpID       string `json:"opId"`
	NewVersion int    `json:"newVersion"`
}

type RemoteOpMessage struct {
	V       int         `json:"v"`
	T       string      `json:"t"`
	Version int         `json:"version"`
	Actor   ActorInfo   `json:"actor"`
	Ops     []Operation `json:"ops"`
}

type ResyncRequiredMessage struct {
	V int    `json:"v"`
	T string `json:"t"`
}

type OpHistoryEntry struct {
	Version  int
	Ops      []Operation
	ClientID string
	OpID     string
}

func utf16Length(text string) int {
	return len(utf16.Encode([]rune(text)))
}

func compareClientIDs(a, b string) int {
	switch {
	case a == b:
		return 0
	case a < b:
		return -1
	default:
		return 1
	}
}

func isNoop(op Operation) bool {
	if op.Type == OpInsert {
		return op.Text == ""
	}
	if op.Type == OpDelete {
		return op.Len <= 0
	}
	return true
}

func applyOperations(content string, ops []Operation) (string, error) {
	updated := content
	for _, op := range ops {
		var err error
		updated, err = applyOperation(updated, op)
		if err != nil {
			return updated, err
		}
	}
	return updated, nil
}

func applyOperation(content string, op Operation) (string, error) {
	switch op.Type {
	case OpInsert:
		return applyInsert(content, op.Pos, op.Text), nil
	case OpDelete:
		if op.Len <= 0 {
			return content, nil
		}
		return applyDelete(content, op.Pos, op.Len), nil
	default:
		return content, errors.New("unknown operation type")
	}
}

func applyInsert(content string, pos int, text string) string {
	if text == "" {
		return content
	}

	contentUnits := utf16.Encode([]rune(content))
	insertUnits := utf16.Encode([]rune(text))

	if pos < 0 {
		pos = 0
	}
	if pos > len(contentUnits) {
		pos = len(contentUnits)
	}

	result := make([]uint16, 0, len(contentUnits)+len(insertUnits))
	result = append(result, contentUnits[:pos]...)
	result = append(result, insertUnits...)
	result = append(result, contentUnits[pos:]...)

	return string(utf16.Decode(result))
}

func applyDelete(content string, pos int, length int) string {
	if length <= 0 {
		return content
	}

	contentUnits := utf16.Encode([]rune(content))

	if pos < 0 {
		pos = 0
	}
	if pos > len(contentUnits) {
		pos = len(contentUnits)
	}

	end := pos + length
	if end > len(contentUnits) {
		end = len(contentUnits)
	}

	result := make([]uint16, 0, len(contentUnits)-(end-pos))
	result = append(result, contentUnits[:pos]...)
	result = append(result, contentUnits[end:]...)

	return string(utf16.Decode(result))
}

func transformOperation(op Operation, other Operation, opClientID, otherClientID string) Operation {
	if isNoop(op) {
		return op
	}

	switch op.Type {
	case OpInsert:
		switch other.Type {
		case OpInsert:
			otherLen := utf16Length(other.Text)
			if op.Pos > other.Pos || (op.Pos == other.Pos && compareClientIDs(opClientID, otherClientID) > 0) {
				op.Pos += otherLen
			}
		case OpDelete:
			otherEnd := other.Pos + other.Len
			if op.Pos > otherEnd {
				op.Pos -= other.Len
			} else if op.Pos > other.Pos {
				op.Pos = other.Pos
			}
		}
	case OpDelete:
		switch other.Type {
		case OpInsert:
			otherLen := utf16Length(other.Text)
			if op.Pos >= other.Pos {
				op.Pos += otherLen
			} else if op.Pos+op.Len > other.Pos {
				op.Len += otherLen
			}
		case OpDelete:
			otherEnd := other.Pos + other.Len
			opEnd := op.Pos + op.Len

			if op.Pos >= otherEnd {
				op.Pos -= other.Len
				return op
			}
			if opEnd <= other.Pos {
				return op
			}

			overlapStart := op.Pos
			if other.Pos > overlapStart {
				overlapStart = other.Pos
			}
			overlapEnd := opEnd
			if otherEnd < overlapEnd {
				overlapEnd = otherEnd
			}
			overlapLen := overlapEnd - overlapStart

			op.Len -= overlapLen
			if other.Pos < op.Pos {
				op.Pos = other.Pos
			}
		}
	}

	return op
}
