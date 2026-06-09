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
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://aero-y6mm.onrender.com';
    const socket: Socket = io(baseURL + "/terminal", {
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
      if (socket.connected) {
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
    <div className="w-full h-full p-4">
      <div className="flex flex-col h-full rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid #333', background: '#000' }}>
        <div className="flex items-center justify-between px-5 py-3 bg-[#1e1e1e] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-xs font-mono ml-2" style={{ color: '#888' }}>
            Remote Shell
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status === "connecting" && <span className="text-xs text-yellow-500">Connecting...</span>}
          {status === "connected" && <span className="text-xs text-green-500">Connected</span>}
          {status === "disconnected" && <span className="text-xs text-red-500">Disconnected</span>}
          {status === "error" && <span className="text-xs text-red-500 truncate max-w-[200px]" title={errorMsg}>{errorMsg}</span>}
        </div>
      </div>
        <div className="flex-1 w-full relative bg-[#09090b] p-4 pl-6 pb-6">
          <div ref={terminalRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
