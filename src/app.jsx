import React from "react";
import { App, ZMPRouter, SnackbarProvider } from "zmp-ui";
import HomePage from "./pages/Home";

export default function MyApp() {
  return (
    <App>
      <SnackbarProvider>
        <ZMPRouter>
          <HomePage />
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  );
}