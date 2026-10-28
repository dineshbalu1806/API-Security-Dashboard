import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import api from "../services/api";

const configuredApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const apiOrigin = /^https?:\/\//i.test(configuredApiUrl)
  ? configuredApiUrl
  : `https://${configuredApiUrl}`;
const socketUrl = apiOrigin.replace(/\/api\/?$/, "").replace(/\/+$/, "");

export default function useScanProgress(scanId) {
  const [scan, setScan] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!scanId) return undefined;
    let active = true;
    let pollTimer;
    const applyScan = (nextScan) => {
      if (active) setScan(nextScan);
    };
    const refresh = async () => {
      try {
        const { data } = await api.get(`/scans/${scanId}`);
        applyScan(data.scan);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Unable to load scan status.");
      }
    };

    refresh();
    const socket = import.meta.env.VITE_API_MODE === "serverless"
      ? null
      : io(socketUrl, {
        auth: { token: localStorage.getItem("sentinel_token") },
        reconnection: true,
      });
    socket?.on("connect", () => socket.emit("scan:join", scanId));
    socket?.on("scan:state", (state) => {
      setScan((current) => current ? { ...current, ...state } : state);
    });
    socket?.on("scan:progress", (event) => {
      setScan((current) => {
        if (!current) return current;
        const moduleProgress = current.moduleProgress || [];
        return {
          ...current,
          moduleProgress: moduleProgress.map((item) => item.module === event.module
            ? { ...item, status: event.status }
            : item),
        };
      });
    });
    pollTimer = window.setInterval(refresh, 5000);

    return () => {
      active = false;
      window.clearInterval(pollTimer);
      socket?.disconnect();
    };
  }, [scanId]);

  return { scan, error };
}