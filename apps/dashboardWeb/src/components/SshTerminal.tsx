"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { io, Socket } from "socket.io-client";

interface SshTerminalProps {
  nodeId: string;
  nodeName?: string;
  token: string;
}

export default function SshTerminal({ nodeId, nodeName, token }: SshTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      theme: {
        background: "#0c0c0c",
        foreground: "#cccccc",
        cursor: "#aeafad",
        selectionBackground: "rgba(255, 255, 255, 0.2)",
        black: "#0c0c0c",
        red: "#c50f1f",
        green: "#13a10e",
        yellow: "#c19c00",
        blue: "#0037da",
        magenta: "#881798",
        cyan: "#3a96dd",
        white: "#cccccc",
        brightBlack: "#767676",
        brightRed: "#e74856",
        brightGreen: "#16c60c",
        brightYellow: "#f9f1a5",
        brightBlue: "#3b78ff",
        brightMagenta: "#b4009e",
        brightCyan: "#61d6d6",
        brightWhite: "#f2f2f2",
      },
      fontFamily: '"Cascadia Code", "Consolas", "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    termRef.current = term;

    // Fit after DOM paint
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    // Socket connection
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://aero-y6mm.onrender.com';
    const socket: Socket = io(baseURL + "/terminal", {
      auth: { token },
      reconnectionAttempts: 3,
      transports: ["websocket"],  // Skip long-polling, go straight to WS
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      // Fit first so we have accurate dimensions
      try { fitAddon.fit(); } catch {}
      socket.emit("terminal:start", { nodeId, cols: term.cols, rows: term.rows });
      // Send resize immediately so the PTY knows the real viewport
      socket.emit("terminal:resize", { cols: term.cols, rows: term.rows });
    });

    let localEchoQueue: string[] = [];

    const isPasswordPrompt = () => {
      try {
        const activeLineIndex = term.buffer.active.cursorY;
        const line = term.buffer.active.getLine(activeLineIndex + term.buffer.active.viewportY);
        if (!line) return false;
        const text = line.translateToString().toLowerCase();
        return text.includes("password") || text.includes("passphrase");
      } catch {
        return false;
      }
    };

    socket.on("terminal:output", (data: string) => {
      let i = 0;
      while (i < data.length && localEchoQueue.length > 0) {
        if (data[i] === localEchoQueue[0]) {
          localEchoQueue.shift();
          i++;
        } else {
          localEchoQueue = [];
          break;
        }
      }
      if (i < data.length) {
        term.write(data.slice(i));
      }
    });

    socket.on("terminal:error", (err: string) => {
      setStatus("error");
      setErrorMsg(err);
      term.writeln(`\r\n\x1b[31m${err}\x1b[0m`);
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
      term.writeln("\r\n\x1b[90m[Session ended]\x1b[0m");
    });

    term.onData((data) => {
      if (socket.connected) {
        // Only locally echo single printable ASCII characters if not in password prompt
        const isPrintable = data.length === 1 && data >= " " && data <= "~";
        if (isPrintable && !isPasswordPrompt()) {
          term.write(data);
          localEchoQueue.push(data);
        }
        socket.volatile.emit("terminal:input", { input: data });
      }
    });

    // Resize
    const handleResize = () => {
      try {
        fitAddon.fit();
        if (socket.connected) {
          socket.emit("terminal:resize", { cols: term.cols, rows: term.rows });
        }
      } catch {
        // ignore fit errors during unmount
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      socket.disconnect();
      term.dispose();
      socketRef.current = null;
      termRef.current = null;
    };
  }, [nodeId, token]);

  const displayName = nodeName || `node-${nodeId.substring(0, 8)}`;

  const statusDot = {
    connecting: "#e8a838",
    connected: "#27c93f",
    disconnected: "#ff5f56",
    error: "#ff5f56",
  }[status];

  const statusLabel = {
    connecting: "Connecting…",
    connected: "Connected",
    disconnected: "Disconnected",
    error: errorMsg && errorMsg.includes("aero daemon") ? "Node Offline" : (errorMsg || "Error"),
  }[status];

  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      borderRadius: "8px",
      overflow: "hidden",
      border: "1px solid #333",
      background: "#0c0c0c",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      {/* Title bar — Windows Terminal style */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        background: "#1e1e1e",
        borderBottom: "1px solid #333",
        minHeight: "38px",
        userSelect: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Terminal icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a96dd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span style={{
            color: "#ccc",
            fontSize: "13px",
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            fontWeight: 400,
          }}>
            {displayName}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: statusDot,
            boxShadow: `0 0 6px ${statusDot}`,
          }} />
          <span style={{
            color: "#888",
            fontSize: "11px",
            fontFamily: '"Segoe UI", system-ui, sans-serif',
          }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Terminal body */}
      <div style={{
        flex: 1,
        padding: "8px 4px 4px 4px",
        background: "#0c0c0c",
        overflow: "hidden",
      }}>
        <div
          ref={terminalRef}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
