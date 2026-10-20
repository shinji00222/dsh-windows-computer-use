// Derived from upstream tool contracts; see NOTICE.md. MIT.
import type {Tool} from "@modelcontextprotocol/sdk/types.js";
import {textTools} from './text-schema.js';
import {batchTool} from './batch-schema.js';
export const catalog: Tool[] = [
  ...textTools, batchTool,
  {
    "name": "windows_computer_use_health",
    "description": "Check that the Windows UI Automation backend, screenshot capture, and input stack are available.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {}
    }
  },
  {
    "name": "windows_computer_use_snapshot",
    "description": "Capture a screenshot and a UI Automation tree for the active window or desktop.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "scope": {
          "type": "string",
          "enum": [
            "active_window",
            "desktop"
          ],
          "default": "active_window"
        },
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "viewMode": {
          "type": "string",
          "enum": [
            "control",
            "content",
            "raw"
          ],
          "default": "control",
          "description": "UI Automation view used for traversal. control is the default compact app-control tree; content returns end-user content nodes; raw returns provider internals for debugging. Applies to scope resolution and tree walking; element ids of the form uia:rt:* are looked up directly by RuntimeId and bypass view filtering (the value is still validated, but not applied)."
        },
        "includeOffscreen": {
          "type": "boolean",
          "default": false,
          "description": "Include UIA elements currently reported as offscreen. Leave false for normal app workflows; set true for debugging or resolving ids from an offscreen-inclusive tree. Like viewMode, this applies to scope resolution and tree walking; uia:rt:* element ids bypass it."
        },
        "detailLevel": {
          "type": "string",
          "enum": [
            "compact",
            "full"
          ],
          "default": "compact",
          "description": "compact omits empty or heavyweight metadata on tree nodes; full returns localized type, process id, runtime id, value, and patterns on every node."
        },
        "treeTimeoutMs": {
          "type": "integer",
          "minimum": 100,
          "maximum": 30000,
          "default": 5000,
          "description": "Traversal time budget checked between synchronous UIA provider calls. Returns a partial tree with truncationReason when exceeded; an individual provider call may exceed this budget."
        },
        "includeScreenshot": {
          "type": "boolean",
          "default": true
        },
        "maxWidth": {
          "type": "integer",
          "minimum": 0,
          "maximum": 7680,
          "default": 1600,
          "description": "Downscale the screenshot so its width is at most this many pixels (0 = native resolution). The response then carries imageScale + origin so image pixels can be mapped back to screen coordinates."
        },
        "maxDepth": {
          "type": "integer",
          "minimum": 0,
          "maximum": 12,
          "default": 5
        },
        "maxNodes": {
          "type": "integer",
          "minimum": 1,
          "maximum": 2000,
          "default": 250
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_accessibility_tree",
    "description": "Read the UI Automation tree without taking a screenshot.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "scope": {
          "type": "string",
          "enum": [
            "active_window",
            "desktop"
          ],
          "default": "active_window"
        },
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "viewMode": {
          "type": "string",
          "enum": [
            "control",
            "content",
            "raw"
          ],
          "default": "control",
          "description": "UI Automation view used for traversal. control is the default compact app-control tree; content returns end-user content nodes; raw returns provider internals for debugging. Applies to scope resolution and tree walking; element ids of the form uia:rt:* are looked up directly by RuntimeId and bypass view filtering (the value is still validated, but not applied)."
        },
        "includeOffscreen": {
          "type": "boolean",
          "default": false,
          "description": "Include UIA elements currently reported as offscreen. Leave false for normal app workflows; set true for debugging or resolving ids from an offscreen-inclusive tree. Like viewMode, this applies to scope resolution and tree walking; uia:rt:* element ids bypass it."
        },
        "detailLevel": {
          "type": "string",
          "enum": [
            "compact",
            "full"
          ],
          "default": "compact",
          "description": "compact omits empty or heavyweight metadata on tree nodes; full returns localized type, process id, runtime id, value, and patterns on every node."
        },
        "treeTimeoutMs": {
          "type": "integer",
          "minimum": 100,
          "maximum": 30000,
          "default": 5000,
          "description": "Traversal time budget checked between synchronous UIA provider calls. Returns a partial tree with truncationReason when exceeded; an individual provider call may exceed this budget."
        },
        "maxDepth": {
          "type": "integer",
          "minimum": 0,
          "maximum": 12,
          "default": 6
        },
        "maxNodes": {
          "type": "integer",
          "minimum": 1,
          "maximum": 3000,
          "default": 500
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_list_windows",
    "description": "List top-level windows visible to Windows UI Automation.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "includeInvisible": {
          "type": "boolean",
          "default": false
        },
        "maxWindows": {
          "type": "integer",
          "minimum": 1,
          "maximum": 200,
          "default": 50
        }
      }
    }
  },
  {
    "name": "windows_computer_use_find",
    "description": "Find UIA elements by name, automation id, class, value or type. When UIA is sparse or incomplete and no match is found, automatically read visible text with OCR. OCR candidates have SCREEN coordinates and source:'ocr', not UIA element ids. If the literal query misses, inspect ocr.lines and reformulate using the visible text (a search box may say '大家都在搜').",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "query"
      ],
      "properties": {
        "query": {
          "type": "string"
        },
        "scope": {
          "type": "string",
          "enum": [
            "active_window",
            "desktop"
          ],
          "default": "active_window"
        },
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "viewMode": {
          "type": "string",
          "enum": [
            "control",
            "content",
            "raw"
          ],
          "default": "control",
          "description": "UI Automation view used for traversal. control is the default compact app-control tree; content returns end-user content nodes; raw returns provider internals for debugging. Applies to scope resolution and tree walking; element ids of the form uia:rt:* are looked up directly by RuntimeId and bypass view filtering (the value is still validated, but not applied)."
        },
        "includeOffscreen": {
          "type": "boolean",
          "default": false,
          "description": "Include UIA elements currently reported as offscreen. Leave false for normal app workflows; set true for debugging or resolving ids from an offscreen-inclusive tree. Like viewMode, this applies to scope resolution and tree walking; uia:rt:* element ids bypass it."
        },
        "treeTimeoutMs": {
          "type": "integer",
          "minimum": 100,
          "maximum": 30000,
          "default": 5000,
          "description": "Traversal time budget checked between synchronous UIA provider calls. Returns a partial tree with truncationReason when exceeded; an individual provider call may exceed this budget."
        },
        "controlType": {
          "type": "string"
        },
        "ocrFallback": {
          "type": "boolean",
          "default": true,
          "description": "Use OCR after an empty sparse/incomplete UIA search. Disable for UIA-only diagnostics. No input is sent."
        },
        "maxDepth": {
          "type": "integer",
          "minimum": 0,
          "maximum": 12,
          "default": 8
        },
        "maxNodes": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5000,
          "default": 1200
        },
        "maxResults": {
          "type": "integer",
          "minimum": 1,
          "maximum": 200,
          "default": 25
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_element_info",
    "description": "Return UI Automation information for an element id or a screen point.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "elementId": {
          "type": "string",
          "description": "ID returned by this engine observation."
        },
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "viewMode": {
          "type": "string",
          "enum": [
            "control",
            "content",
            "raw"
          ],
          "default": "control",
          "description": "UI Automation view used for traversal. control is the default compact app-control tree; content returns end-user content nodes; raw returns provider internals for debugging. Applies to scope resolution and tree walking; element ids of the form uia:rt:* are looked up directly by RuntimeId and bypass view filtering (the value is still validated, but not applied)."
        },
        "includeOffscreen": {
          "type": "boolean",
          "default": false,
          "description": "Include UIA elements currently reported as offscreen. Leave false for normal app workflows; set true for debugging or resolving ids from an offscreen-inclusive tree. Like viewMode, this applies to scope resolution and tree walking; uia:rt:* element ids bypass it."
        },
        "detailLevel": {
          "type": "string",
          "enum": [
            "compact",
            "full"
          ],
          "default": "compact",
          "description": "compact omits empty or heavyweight metadata on tree nodes; full returns localized type, process id, runtime id, value, and patterns on every node."
        },
        "x": {
          "type": "integer"
        },
        "y": {
          "type": "integer"
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_click",
    "description": "Click/double-click element center or physical SCREEN x/y in the observed foreground window. Reject stale/moved/occluded targets. Read UI again to verify effect.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "elementId": {
          "type": "string"
        },
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "viewMode": {
          "type": "string",
          "enum": [
            "control",
            "content",
            "raw"
          ],
          "default": "control",
          "description": "UI Automation view used for traversal. control is the default compact app-control tree; content returns end-user content nodes; raw returns provider internals for debugging. Applies to scope resolution and tree walking; element ids of the form uia:rt:* are looked up directly by RuntimeId and bypass view filtering (the value is still validated, but not applied)."
        },
        "includeOffscreen": {
          "type": "boolean",
          "default": false,
          "description": "Include UIA elements currently reported as offscreen. Leave false for normal app workflows; set true for debugging or resolving ids from an offscreen-inclusive tree. Like viewMode, this applies to scope resolution and tree walking; uia:rt:* element ids bypass it."
        },
        "x": {
          "type": "integer"
        },
        "y": {
          "type": "integer"
        },
        "button": {
          "type": "string",
          "enum": [
            "left",
            "right",
            "middle"
          ],
          "default": "left"
        },
        "dispatch": {
          "type": "string",
          "enum": [
            "foreground"
          ],
          "default": "foreground"
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_double_click",
    "description": "Click/double-click element center or physical SCREEN x/y in the observed foreground window. Reject stale/moved/occluded targets. Read UI again to verify effect.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "elementId": {
          "type": "string"
        },
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "viewMode": {
          "type": "string",
          "enum": [
            "control",
            "content",
            "raw"
          ],
          "default": "control",
          "description": "UI Automation view used for traversal. control is the default compact app-control tree; content returns end-user content nodes; raw returns provider internals for debugging. Applies to scope resolution and tree walking; element ids of the form uia:rt:* are looked up directly by RuntimeId and bypass view filtering (the value is still validated, but not applied)."
        },
        "includeOffscreen": {
          "type": "boolean",
          "default": false,
          "description": "Include UIA elements currently reported as offscreen. Leave false for normal app workflows; set true for debugging or resolving ids from an offscreen-inclusive tree. Like viewMode, this applies to scope resolution and tree walking; uia:rt:* element ids bypass it."
        },
        "x": {
          "type": "integer"
        },
        "y": {
          "type": "integer"
        },
        "button": {
          "type": "string",
          "enum": [
            "left",
            "right",
            "middle"
          ],
          "default": "left"
        },
        "dispatch": {
          "type": "string",
          "enum": [
            "foreground"
          ],
          "default": "foreground"
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_move",
    "description": "Move the mouse pointer to a screen coordinate or the center of an element.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "elementId": {
          "type": "string"
        },
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "viewMode": {
          "type": "string",
          "enum": [
            "control",
            "content",
            "raw"
          ],
          "default": "control",
          "description": "UI Automation view used for traversal. control is the default compact app-control tree; content returns end-user content nodes; raw returns provider internals for debugging. Applies to scope resolution and tree walking; element ids of the form uia:rt:* are looked up directly by RuntimeId and bypass view filtering (the value is still validated, but not applied)."
        },
        "includeOffscreen": {
          "type": "boolean",
          "default": false,
          "description": "Include UIA elements currently reported as offscreen. Leave false for normal app workflows; set true for debugging or resolving ids from an offscreen-inclusive tree. Like viewMode, this applies to scope resolution and tree walking; uia:rt:* element ids bypass it."
        },
        "x": {
          "type": "integer"
        },
        "y": {
          "type": "integer"
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_drag",
    "description": "Drag through a path of screen coordinates.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "path"
      ],
      "properties": {
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "path": {
          "type": "array",
          "minItems": 2,
          "items": {
            "type": "object",
            "required": [
              "x",
              "y"
            ],
            "additionalProperties": false,
            "properties": {
              "x": {
                "type": "integer"
              },
              "y": {
                "type": "integer"
              }
            }
          },
          "maxItems": 1000
        },
        "button": {
          "type": "string",
          "enum": [
            "left",
            "right",
            "middle"
          ],
          "default": "left"
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_scroll",
    "description": "Scroll at a screen coordinate or element center. Positive deltaY scrolls down.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "elementId": {
          "type": "string"
        },
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "viewMode": {
          "type": "string",
          "enum": [
            "control",
            "content",
            "raw"
          ],
          "default": "control",
          "description": "UI Automation view used for traversal. control is the default compact app-control tree; content returns end-user content nodes; raw returns provider internals for debugging. Applies to scope resolution and tree walking; element ids of the form uia:rt:* are looked up directly by RuntimeId and bypass view filtering (the value is still validated, but not applied)."
        },
        "includeOffscreen": {
          "type": "boolean",
          "default": false,
          "description": "Include UIA elements currently reported as offscreen. Leave false for normal app workflows; set true for debugging or resolving ids from an offscreen-inclusive tree. Like viewMode, this applies to scope resolution and tree walking; uia:rt:* element ids bypass it."
        },
        "x": {
          "type": "integer"
        },
        "y": {
          "type": "integer"
        },
        "deltaY": {
          "type": "integer",
          "default": 480
        },
        "deltaX": {
          "type": "integer",
          "default": 0
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_type_text",
    "description": "Type into foreground target. sendinput supports Unicode without clipboard; clipboard optionally pastes/restores. Requires prior observation. verifyValue is readback, not a task-success claim.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "text"
      ],
      "properties": {
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "text": {
          "type": "string",
          "maxLength": 100000
        },
        "method": {
          "type": "string",
          "enum": [
            "clipboard",
            "sendinput"
          ],
          "default": "sendinput"
        },
        "focusMode": {
          "type": "string",
          "enum": [
            "preserve",
            "main"
          ],
          "default": "preserve",
          "description": "preserve keeps the focus established by a previous click, essential for OCR/visual targets. main explicitly tries to focus the window's largest Edit/Document control."
        },
        "restoreClipboard": {
          "type": "boolean",
          "default": true
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_keypress",
    "description": "Press a key or key chord, such as Ctrl+L, Enter, Alt+F4, or Shift+Tab. The Windows key is blocked by design. dispatch:'",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "keys"
      ],
      "properties": {
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "keys": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "string"
          }
        },
        "dispatch": {
          "type": "string",
          "enum": [
            "foreground"
          ],
          "default": "foreground"
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_focus",
    "description": "Set keyboard focus to a UI Automation element.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "elementId"
      ],
      "properties": {
        "elementId": {
          "type": "string"
        },
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "viewMode": {
          "type": "string",
          "enum": [
            "control",
            "content",
            "raw"
          ],
          "default": "control",
          "description": "UI Automation view used for traversal. control is the default compact app-control tree; content returns end-user content nodes; raw returns provider internals for debugging. Applies to scope resolution and tree walking; element ids of the form uia:rt:* are looked up directly by RuntimeId and bypass view filtering (the value is still validated, but not applied)."
        },
        "includeOffscreen": {
          "type": "boolean",
          "default": false,
          "description": "Include UIA elements currently reported as offscreen. Leave false for normal app workflows; set true for debugging or resolving ids from an offscreen-inclusive tree. Like viewMode, this applies to scope resolution and tree walking; uia:rt:* element ids bypass it."
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_invoke",
    "description": "Invoke/toggle/select/expand a known UIA element. No blind click fallback.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "elementId"
      ],
      "properties": {
        "elementId": {
          "type": "string"
        },
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "viewMode": {
          "type": "string",
          "enum": [
            "control",
            "content",
            "raw"
          ],
          "default": "control",
          "description": "UI Automation view used for traversal. control is the default compact app-control tree; content returns end-user content nodes; raw returns provider internals for debugging. Applies to scope resolution and tree walking; element ids of the form uia:rt:* are looked up directly by RuntimeId and bypass view filtering (the value is still validated, but not applied)."
        },
        "includeOffscreen": {
          "type": "boolean",
          "default": false,
          "description": "Include UIA elements currently reported as offscreen. Leave false for normal app workflows; set true for debugging or resolving ids from an offscreen-inclusive tree. Like viewMode, this applies to scope resolution and tree walking; uia:rt:* element ids bypass it."
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_set_value",
    "description": "Set a UIA ValuePattern and read it back; unsupported controls return an error. No typing fallback.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "elementId",
        "value"
      ],
      "properties": {
        "elementId": {
          "type": "string"
        },
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "viewMode": {
          "type": "string",
          "enum": [
            "control",
            "content",
            "raw"
          ],
          "default": "control",
          "description": "UI Automation view used for traversal. control is the default compact app-control tree; content returns end-user content nodes; raw returns provider internals for debugging. Applies to scope resolution and tree walking; element ids of the form uia:rt:* are looked up directly by RuntimeId and bypass view filtering (the value is still validated, but not applied)."
        },
        "includeOffscreen": {
          "type": "boolean",
          "default": false,
          "description": "Include UIA elements currently reported as offscreen. Leave false for normal app workflows; set true for debugging or resolving ids from an offscreen-inclusive tree. Like viewMode, this applies to scope resolution and tree walking; uia:rt:* element ids bypass it."
        },
        "value": {
          "type": "string"
        },
        "restoreClipboard": {
          "type": "boolean",
          "default": true
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_activate_window",
    "description": "Bring a top-level window to the foreground by title substring, process id, or native HWND. This tool always activates its target; the shared activate flag cannot suppress it.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_wait",
    "description": "Wait for a short period before observing the UI again.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "milliseconds": {
          "type": "integer",
          "minimum": 1,
          "maximum": 30000,
          "default": 500
        }
      }
    }
  },
  {
    "name": "windows_computer_use_ocr",
    "description": "Read visible text with Windows.Media.Ocr, independent of UIA by default. Returns text, lines and word boxes in SCREEN coordinates. query is literal text matching, not semantic recognition; inspect lines if 'search' misses a placeholder. Click matched.word.x/y using foreground dispatch, then type_text with focusMode:'preserve'. Optional resolveControl performs a potentially blocking UIA hit-test; its control may be the whole page rather than the text input.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "scope": {
          "type": "string",
          "enum": [
            "active_window",
            "desktop"
          ],
          "default": "active_window"
        },
        "maxWidth": {
          "type": "integer",
          "minimum": 0,
          "maximum": 7680,
          "default": 1920
        },
        "includeScreenshot": {
          "type": "boolean",
          "default": false
        },
        "query": {
          "type": "string",
          "description": "Optional literal text query, case-insensitive and ignoring whitespace. Returns up to 3 matched word runs with screen boundingBox and center in word.x/y. control is null unless resolveControl:true opts into a UIA hit-test. Supports character-segmented CJK text."
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_screenshot",
    "description": "Capture window/desktop to an in-memory image. SCREEN = bounds origin + image/imageScale. Screen crops may be occluded; inspect source and occludedPossible.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "scope": {
          "type": "string",
          "enum": [
            "active_window",
            "desktop"
          ],
          "default": "active_window"
        },
        "maxWidth": {
          "type": "integer",
          "minimum": 0,
          "maximum": 7680,
          "default": 1600
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_wait_for",
    "description": "Wait for a window, a UIA element, or literal visible OCR text to appear/disappear. condition:'window' uses native window enumeration; 'element' uses a bounded UIA query; 'text' uses OCR without UIA. Returns verification:'observed' only when the condition was observed; truncated UIA absence is inconclusive. Text is literal, so use the actual expected text, not an inferred semantic label.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "condition": {
          "type": "string",
          "enum": [
            "window",
            "element",
            "text"
          ],
          "default": "window"
        },
        "query": {
          "type": "string"
        },
        "controlType": {
          "type": "string"
        },
        "scope": {
          "type": "string",
          "enum": [
            "active_window",
            "desktop"
          ],
          "default": "active_window"
        },
        "viewMode": {
          "type": "string",
          "enum": [
            "control",
            "content",
            "raw"
          ],
          "default": "control",
          "description": "UI Automation view used for traversal. control is the default compact app-control tree; content returns end-user content nodes; raw returns provider internals for debugging. Applies to scope resolution and tree walking; element ids of the form uia:rt:* are looked up directly by RuntimeId and bypass view filtering (the value is still validated, but not applied)."
        },
        "includeOffscreen": {
          "type": "boolean",
          "default": false,
          "description": "Include UIA elements currently reported as offscreen. Leave false for normal app workflows; set true for debugging or resolving ids from an offscreen-inclusive tree. Like viewMode, this applies to scope resolution and tree walking; uia:rt:* element ids bypass it."
        },
        "treeTimeoutMs": {
          "type": "integer",
          "minimum": 100,
          "maximum": 30000,
          "default": 1000
        },
        "maxDepth": {
          "type": "integer",
          "minimum": 0,
          "maximum": 12,
          "default": 8
        },
        "maxNodes": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5000,
          "default": 1200
        },
        "appear": {
          "type": "boolean",
          "default": true
        },
        "timeoutMs": {
          "type": "integer",
          "minimum": 100,
          "maximum": 60000,
          "default": 5000
        },
        "intervalMs": {
          "type": "integer",
          "minimum": 50,
          "maximum": 5000,
          "default": 250
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_close_window",
    "description": "Close a window gracefully by posting WM_CLOSE (the app can veto with a save dialog). Safer than killing the process; use close_window instead of alt+f4 when the app may have unsaved state you want to handle. The shared activate flag is ignored: WM_CLOSE is posted in the background and needs no foreground switch.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_move_window",
    "description": "Move (not resize) a window to screen coordinates without activating it. Useful for arranging windows, and it also refreshes the homing cache for coordinate-based actions.",
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "x",
        "y"
      ],
      "properties": {
        "windowTitle": {
          "type": "string",
          "description": "Substring of a top-level window title to target instead of the foreground window.",
          "minLength": 1
        },
        "processId": {
          "type": "integer",
          "minimum": 1,
          "description": "Process id of a top-level window to target instead of the foreground window."
        },
        "nativeWindowHandle": {
          "type": "integer",
          "minimum": 1,
          "description": "Native HWND of a top-level window to target instead of the foreground window."
        },
        "activate": {
          "type": "boolean",
          "default": false,
          "description": "Bring the targeted window to the foreground before acting. Honoured by: drag, type_text and keypress (input needs the foreground); element-target resolution in snapshot/accessibility_tree/find/element_info/focus/invoke/set_value; the x/y coordinate paths of click/double_click/move/scroll and element_info; window capture in ocr; move_window (activates the moved window). Ignored by close_window (WM_CLOSE works in the background); activate_window always activates regardless of this flag."
        },
        "x": {
          "type": "integer"
        },
        "y": {
          "type": "integer"
        },
        "observationId": {
          "type": "string",
          "description": "Optional token from latest observation; stale tokens reject actions."
        }
      }
    }
  },
  {
    "name": "windows_computer_use_resume",
    "description": "Standalone MCP only: resume after an explicit new human request. DSH turns resume automatically on a new turn; never resume a stopped DSH turn.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    }
  }
];
