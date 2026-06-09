"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { io, Socket } from "socket.io-client";

interface SshTerminalProps {
  nodeId: string;
  token: string;
}

export default function SshTerminal({ nodeId, token }: SshTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#000000",
        foreground: "#ffffff",
        cursor: "#ffffff",
        selectionBackground: "rgba(255, 255, 255, 0.3)",
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    // Defer fitting slightly to ensure DOM is ready
    setTimeout(() => {
      fitAddon.fit();
    }, 50);

    // Initialize Socket.io Connection
    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL + "/terminal", {
      auth: { token },
      reconnectionAttempts: 3,
    });

    socket.on("connect", () => {
      setStatus("connected");
      term.writeln("\x1b[32m[Aero Terminal] Connected to proxy server.\x1b[0m");
      term.writeln("\x1b[36m[Aero Terminal] Requesting node session...\x1b[0m");
      
      socket.emit("terminal:start", { nodeId });
    });

    socket.on("terminal:output", (data: string) => {
      term.write(data);
    });

    socket.on("terminal:error", (err: string) => {
      setStatus("error");
      setErrorMsg(err);
      term.writeln(`\r\n\x1b[31m[Error] ${err}\x1b[0m`);
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
      term.writeln("\r\n\x1b[31m[Aero Terminal] Disconnected from server.\x1b[0m");
    });

    // Handle user input
    term.onData((data) => {
      if (status === "connected") {
        socket.emit("terminal:input", { input: data });
      }
    });

    // Handle Resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (status === "connected") {
        socket.emit("terminal:resize", { cols: term.cols, rows: term.rows });
      }
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      socket.disconnect();
      term.dispose();
    };
  }, [nodeId, token]);

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden" style={{ border: '1px solid #333', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', background: '#000' }}>
      <div className="flex items-center justify-between px-6 py-3 bg-[#1e1e1e] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
          <span className="text-xs font-mono" style={{ color: '#ccc' }}>
            <span style={{ color: '#8b5cf6' }}>root</span>@<span style={{ color: '#38bdf8' }}>{nodeId}</span>: <span style={{ color: '#a3e635' }}>~</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status === "connecting" && <span className="text-xs text-yellow-500">Connecting...</span>}
          {status === "connected" && <span className="text-xs text-green-500">Connected</span>}
          {status === "disconnected" && <span className="text-xs text-red-500">Disconnected</span>}
          {status === "error" && <span className="text-xs text-red-500 truncate max-w-[200px]" title={errorMsg}>{errorMsg}</span>}
        </div>
      </div>
      <div className="flex-1 w-full relative bg-[#09090b] p-4 pl-6">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
}
