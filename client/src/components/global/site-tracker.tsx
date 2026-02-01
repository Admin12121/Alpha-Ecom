"use client";

import { useEffect, useRef } from "react";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useGetLoggedUserQuery, userAuthapi } from "@/lib/store/Service/api"; // Assuming api import
import axios from "axios";

const TRACKING_KEY = "nas_site_view_logged";

export function SiteTracker() {
    const { accessToken } = useAuthUser();
    const loggedRef = useRef(false);

    useEffect(() => {
        const trackView = async () => {
            // Prevent double logging in strict mode or re-renders
            if (loggedRef.current || sessionStorage.getItem(TRACKING_KEY)) return;

            try {
                loggedRef.current = true;
                sessionStorage.setItem(TRACKING_KEY, "true");

                // Simple device detection
                const userAgent = navigator.userAgent;
                let deviceType = "Desktop";
                if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
                    deviceType = "Mobile";
                }

                // Get location (best effort free API)
                let locationData = { city: "Unknown", country: "Unknown" };
                try {
                    const geoRes = await axios.get("https://ipapi.co/json/");
                    if (geoRes.data) {
                        locationData = {
                            city: geoRes.data.city || "Unknown",
                            country: geoRes.data.country_name || "Unknown"
                        };
                    }
                } catch (e) {
                    console.warn("Failed to get geolocation", e);
                }

                // Send to backend
                const payload = {
                    user_agent: deviceType, // Sending simplified device type as requested
                    location: locationData,
                    // Backend will handle user from token/auth context if we send header? 
                    // We need to call the API endpoint.
                };

                // We can use fetch or axios. using fetch to avoid redux dependency inside this raw logic if possible, 
                // but we have accessToken.
                const headers: any = {
                    "Content-Type": "application/json"
                };
                if (accessToken) {
                    headers["Authorization"] = `Bearer ${accessToken}`;
                }

                await fetch(`${process.env.NEXT_PUBLIC_BACKEND_DOMAIN}/api/accounts/site-view-logs/`, {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify(payload)
                });

            } catch (error) {
                console.error("Site tracking failed", error);
                sessionStorage.removeItem(TRACKING_KEY); // Retry next time if failed?
                loggedRef.current = false;
            }
        };

        trackView();
    }, [accessToken]);

    return null;
}
