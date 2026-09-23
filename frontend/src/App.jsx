import { useEffect, useState } from "react";
import api from "./services/api";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");

  useEffect(() => {
    api
      .get("/health")
      .then((response) => {
        setBackendStatus(response.data.status);
      })
      .catch(() => {
        setBackendStatus("Backend unavailable");
      });
  }, []);

  return (
    <div>
      <h1>EventHub</h1>
      <p>Backend status: {backendStatus}</p>
    </div>
  );
}

export default App;
