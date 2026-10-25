import { useEffect, useRef, useState } from "react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";

import { loginRequest } from "./authConfig";
import api from "./services/api";

export default function AttendanceScanner() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = accounts[0];
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const processingScanRef = useRef(false);
  const [profile, setProfile] = useState(null);
  const [profileStatus, setProfileStatus] = useState("signed_out");
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [credential, setCredential] = useState("");
  const [cameraStatus, setCameraStatus] = useState("idle");

  async function getAccessToken() {
    if (!account) throw new Error("Sign in with your Club account first.");
    try {
      return await instance.acquireTokenSilent({ ...loginRequest, account });
    } catch (authError) {
      if (authError instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect({ ...loginRequest, account });
        return null;
      }
      throw authError;
    }
  }

  async function loadAttendees(selectedEventId = eventId) {
    if (!selectedEventId) {
      setAttendees([]);
      return;
    }
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await api.get(`/api/events/${selectedEventId}/registrations`, {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });
      setAttendees(response.data);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not load this event’s attendees.");
    }
  }

  async function submitCheckIn(rawCredential) {
    const cleanCredential = rawCredential.trim();
    if (!cleanCredential) return;
    setMessage("");
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await api.post(
        "/api/attendance/check-in",
        { credential: cleanCredential },
        { headers: { Authorization: `Bearer ${token.accessToken}` } },
      );
      setMessage(`${response.data.attendee_name} checked in successfully.`);
      setCredential("");
      await loadAttendees();
    } catch (requestError) {
      const status = requestError.response?.status;
      if (status === 403) {
        setError("This Club account does not own the selected attendee’s event.");
      } else if (status === 404) {
        setError("That QR code is invalid or no longer available.");
      } else if (status === 409) {
        setError("This registration has already been checked in.");
      } else {
        setError(requestError.response?.data?.detail || "Check-in could not be completed.");
      }
    }
  }

  function stopCamera() {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("idle");
  }

  async function startCamera() {
    setError("");
    setMessage("");
    if (!("BarcodeDetector" in window)) {
      setCameraStatus("unsupported");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is unavailable in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      setCameraStatus("scanning");
      scanTimerRef.current = window.setInterval(async () => {
        if (processingScanRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0 && codes[0].rawValue) {
            processingScanRef.current = true;
            stopCamera();
            await submitCheckIn(codes[0].rawValue);
            processingScanRef.current = false;
          }
        } catch {
          setError("The camera could not read that QR code. Try again or enter the code below.");
        }
      }, 350);
    } catch (cameraError) {
      stopCamera();
      setError(cameraError.message || "Camera permission was denied.");
    }
  }

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated || !account) {
      setProfile(null);
      setProfileStatus("signed_out");
      return () => { active = false; };
    }

    setProfileStatus("loading");
    instance.acquireTokenSilent({ ...loginRequest, account })
      .then((token) => api.get("/users/me", {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      }))
      .then((response) => {
        if (!active) return;
        setProfile(response.data);
        setProfileStatus("loaded");
      })
      .catch(async (authError) => {
        if (authError instanceof InteractionRequiredAuthError) {
          await instance.acquireTokenRedirect({ ...loginRequest, account });
          return;
        }
        if (active) setProfileStatus("error");
      });

    return () => { active = false; };
  }, [account, instance, isAuthenticated]);

  useEffect(() => {
    let active = true;
    if (profileStatus !== "loaded" || profile?.role !== "CLUB") return () => { active = false; };
    Promise.all([
      api.get("/api/events", { params: { event_status: "APPROVED" } }),
      api.get("/api/clubs"),
    ])
      .then(([eventsResponse, clubsResponse]) => {
        if (!active) return;
        const accountEmail = (profile.email || "").trim().toLocaleLowerCase();
        const ownedClubIds = new Set(
          clubsResponse.data
            .filter((club) => (club.contact_email || "").trim().toLocaleLowerCase() === accountEmail)
            .map((club) => club.id),
        );
        setEvents(eventsResponse.data.filter((event) => ownedClubIds.has(event.club_id)));
      })
      .catch(() => {
        if (active) setError("Could not load your Club events. Please refresh and try again.");
      });
    return () => { active = false; };
  }, [profile, profileStatus]);

  async function handleEventChange(value) {
    setEventId(value);
    setAttendees([]);
    setMessage("");
    setError("");
    if (!value) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await api.get(`/api/events/${value}/registrations`, {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });
      setAttendees(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "This Club account cannot view that event’s attendees.");
    }
  }

  return (
    <main className="attendance-page" style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <a href="/register">← Back to events</a>
      <h1>Club event attendance</h1>
      {!isAuthenticated ? (
        <button type="button" onClick={() => instance.loginRedirect(loginRequest)}>
          Sign in with Microsoft
        </button>
      ) : profileStatus === "loading" ? (
        <p role="status">Loading your profile…</p>
      ) : profileStatus === "error" ? (
        <p role="alert">Could not verify your account. Refresh and try again.</p>
      ) : profile?.role !== "CLUB" ? (
        <p>Attendance management is available to Club accounts.</p>
      ) : (
        <>
          <p>Signed in as {profile.full_name || profile.email}</p>
          <label htmlFor="attendance-event">Choose your event</label>{" "}
          <select id="attendance-event" value={eventId} onChange={(event) => handleEventChange(event.target.value)}>
            <option value="">Select an event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
          {eventId && (
            <section aria-label="QR check-in" style={{ marginTop: 24 }}>
              <h2>Scan a student’s QR code</h2>
              {cameraStatus === "scanning" && <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", maxWidth: 480 }} />}
              {cameraStatus !== "scanning" && (
                <button type="button" onClick={startCamera}>Start camera scan</button>
              )}
              {cameraStatus === "unsupported" && (
                <p>Your browser does not support QR camera scanning. Enter the QR credential below.</p>
              )}
              <form onSubmit={(event) => { event.preventDefault(); submitCheckIn(credential); }}>
                <label htmlFor="qr-credential">QR credential</label>{" "}
                <input id="qr-credential" value={credential} onChange={(event) => setCredential(event.target.value)} autoComplete="off" />{" "}
                <button type="submit" disabled={!credential.trim()}>Check in</button>
              </form>
              {message && <p role="status">{message}</p>}
              {error && <p role="alert">{error}</p>}
            </section>
          )}
          <section aria-label="Attendee roster" style={{ marginTop: 24 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <h2>Attendees</h2>
              {eventId && <button type="button" onClick={() => loadAttendees()}>Refresh list</button>}
            </div>
            {eventId && attendees.length === 0 ? (
              <p>No registrations found for this event.</p>
            ) : attendees.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Attendance</th></tr></thead>
                  <tbody>{attendees.map((attendee) => (
                    <tr key={attendee.id}>
                      <td>{attendee.attendee_name}</td>
                      <td>{attendee.attendee_email}</td>
                      <td>{attendee.checked_in_at ? "Checked in" : "Not checked in"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p>Select an event to view its attendees.</p>}
          </section>
        </>
      )}
    </main>
  );
}
