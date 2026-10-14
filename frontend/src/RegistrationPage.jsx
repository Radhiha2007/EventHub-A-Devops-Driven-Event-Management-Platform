import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import api from "./services/api";

function formatEventDate(value) {
  if (!value) return "Date to be announced";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatEventTime(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getApiErrorMessage(error) {
  const status = error.response?.status;
  const detail = error.response?.data?.detail;
  const message = typeof detail === "string" ? detail.toLowerCase() : "";

  if (status === 409 && message.includes("already registered")) {
    return "This email is already registered for this event.";
  }
  if (status === 409 && message.includes("capacity")) {
    return "This event is full. Registration is no longer available.";
  }
  if (status === 409 && message.includes("deadline")) {
    return "Registration for this event has closed.";
  }
  if (status === 409 && message.includes("approved")) {
    return "This event is not currently open for registration.";
  }
  if (status === 404) {
    return "This event could not be found. Refresh the event list and try again.";
  }
  if (status === 422) {
    return "Please enter a valid name and email address.";
  }
  if (typeof detail === "string" && detail.trim()) return detail;
  if (!error.response) {
    return "We could not reach EventHub. Check your connection and try again.";
  }
  return "Registration could not be completed. Please try again.";
}

export default function RegistrationPage() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [events, setEvents] = useState([]);
  const [eventsState, setEventsState] = useState("loading");
  const [eventsError, setEventsError] = useState("");
  const [registrationStates, setRegistrationStates] = useState({});

  useEffect(() => {
    let isMounted = true;

    api
      .get("/health")
      .then((response) => {
        if (isMounted) setBackendStatus(response.data.status);
      })
      .catch(() => {
        if (isMounted) setBackendStatus("Backend unavailable");
      });

    api
      .get("/api/events", { params: { event_status: "APPROVED" } })
      .then((response) => {
        if (!isMounted) return;
        setEvents(response.data);
        setEventsState("loaded");
      })
      .catch((error) => {
        if (!isMounted) return;
        setEventsError(getApiErrorMessage(error));
        setEventsState("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRegistration(eventId, formEvent) {
    formEvent.preventDefault();
    const formData = new FormData(formEvent.currentTarget);
    const payload = {
      attendee_name: formData.get("attendee_name").trim(),
      attendee_email: formData.get("attendee_email").trim(),
    };

    setRegistrationStates((current) => ({
      ...current,
      [eventId]: { status: "loading" },
    }));

    try {
      const response = await api.post(
        `/api/events/${eventId}/registrations`,
        payload,
      );
      setRegistrationStates((current) => ({
        ...current,
        [eventId]: { status: "success", registration: response.data },
      }));
    } catch (error) {
      setRegistrationStates((current) => ({
        ...current,
        [eventId]: { status: "error", message: getApiErrorMessage(error) },
      }));
    }
  }

  function dismissConfirmation(eventId) {
    setRegistrationStates((current) => {
      const next = { ...current };
      delete next[eventId];
      return next;
    });
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="EventHub home">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span>EventHub</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#events">Explore events</a>
        </nav>
        <div
          className={`backend-status ${backendStatus === "healthy" ? "is-online" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span className="status-dot" aria-hidden="true" />
          <span>Backend: {backendStatus}</span>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">Campus life, all in one place</p>
          <h1 id="hero-title">Find your next<br />favorite event.</h1>
          <p className="hero-copy">
            Discover what is happening on campus and save your spot in a few
            seconds.
          </p>
          <a className="hero-link" href="#events">
            Browse approved events <span aria-hidden="true">↓</span>
          </a>
          <div className="hero-decoration" aria-hidden="true">
            <span className="decoration-orbit orbit-one" />
            <span className="decoration-orbit orbit-two" />
            <span className="decoration-star">✳</span>
          </div>
        </section>

        <section className="events-section" id="events" aria-labelledby="events-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Make a plan</p>
              <h2 id="events-title">Upcoming events</h2>
            </div>
            {eventsState === "loaded" && events.length > 0 && (
              <p className="event-count">
                {events.length} {events.length === 1 ? "event" : "events"}
              </p>
            )}
          </div>

          {eventsState === "loading" && (
            <p className="state-message" role="status" aria-live="polite">
              Loading approved events…
            </p>
          )}

          {eventsState === "error" && (
            <div className="state-message state-error" role="alert">
              <p>{eventsError}</p>
              <button className="text-button" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          )}

          {eventsState === "loaded" && events.length === 0 && (
            <div className="state-message empty-state" role="status">
              <span className="empty-icon" aria-hidden="true">✳</span>
              <h3>No approved events yet</h3>
              <p>Check back soon. New campus events will appear here.</p>
            </div>
          )}

          {eventsState === "loaded" && events.length > 0 && (
            <div className="event-grid">
              {events.map((event) => {
                const registrationState = registrationStates[event.id];
                const registration = registrationState?.registration;
                const timeRange = [
                  formatEventTime(event.start_time),
                  formatEventTime(event.end_time),
                ].filter(Boolean).join(" – ");

                return (
                  <article className="event-card" key={event.id}>
                    {event.poster_url ? (
                      <img
                        className="event-poster"
                        src={event.poster_url}
                        alt={`${event.title} event poster`}
                      />
                    ) : (
                      <div className="event-poster poster-placeholder" aria-hidden="true">
                        <span>{event.category?.slice(0, 1) || "E"}</span>
                      </div>
                    )}

                    <div className="event-content">
                      <div className="event-topline">
                        <span className="category-tag">{event.category}</span>
                        <span className="event-date">{formatEventDate(event.event_date)}</span>
                      </div>
                      <h3>{event.title}</h3>
                      {event.description && <p className="event-description">{event.description}</p>}

                      <dl className="event-details">
                        <div>
                          <dt>Where</dt>
                          <dd>{event.venue}</dd>
                        </div>
                        {timeRange && (
                          <div>
                            <dt>When</dt>
                            <dd>{timeRange}</dd>
                          </div>
                        )}
                        {event.capacity != null && (
                          <div>
                            <dt>Capacity</dt>
                            <dd>{event.capacity} attendees</dd>
                          </div>
                        )}
                      </dl>

                      {registrationState?.status === "success" ? (
                        <section className="confirmation" aria-live="polite">
                          <div className="confirmation-heading">
                            <span className="confirmation-check" aria-hidden="true">✓</span>
                            <div>
                              <h4>You’re registered!</h4>
                              <p>Your spot for {event.title} is confirmed.</p>
                            </div>
                          </div>
                          <div className="qr-card">
                            <QRCodeSVG
                              value={registration.qr_credential}
                              size={184}
                              level="M"
                              includeMargin
                              title={`Event check-in QR code for ${registration.attendee_name}`}
                            />
                            <p>Show this code at event check-in.</p>
                          </div>
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => dismissConfirmation(event.id)}
                          >
                            Hide confirmation
                          </button>
                        </section>
                      ) : (
                        <form
                          className="registration-form"
                          onSubmit={(formEvent) => handleRegistration(event.id, formEvent)}
                        >
                          <h4>Save your spot</h4>
                          <label htmlFor={`attendee-name-${event.id}`}>Full name</label>
                          <input
                            id={`attendee-name-${event.id}`}
                            name="attendee_name"
                            type="text"
                            autoComplete="name"
                            maxLength="255"
                            placeholder="Your name"
                            required
                          />
                          <label htmlFor={`attendee-email-${event.id}`}>Email address</label>
                          <input
                            id={`attendee-email-${event.id}`}
                            name="attendee_email"
                            type="email"
                            autoComplete="email"
                            maxLength="320"
                            placeholder="you@example.com"
                            required
                          />
                          {registrationState?.status === "error" && (
                            <p className="form-error" role="alert">
                              {registrationState.message}
                            </p>
                          )}
                          <button
                            className="register-button"
                            type="submit"
                            disabled={registrationState?.status === "loading"}
                          >
                            {registrationState?.status === "loading" ? "Registering…" : "Register for free"}
                          </button>
                        </form>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span>EventHub</span>
        </a>
        <p>Make campus memories happen.</p>
      </footer>
    </div>
  );
}
