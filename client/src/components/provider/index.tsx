"use client";

import { useRef } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";
import { Toaster } from "sonner";
import Spinner from "@/components/ui/spinner";
import { Provider as ReduxProvider } from "react-redux";
import { store, AppStore } from "@/lib/store/store";
import { CartProvider } from "@/lib/cart-context";
import { ReactQueryProvider } from "@/lib/store/react-query-provider";
import { SessionProvider } from "next-auth/react";
import { SiteTracker } from "@/components/global/site-tracker";

export const Provider = ({ children, session, ...props }: ThemeProviderProps & { session?: any }) => {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = store();
  }
  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <Toaster
        icons={{ loading: <Spinner size="sm" color="secondary" /> }}
        invert={true}
        pauseWhenPageIsHidden={true}
        theme="system"
        position="bottom-right"
      />
      <SessionProvider session={session} refetchOnWindowFocus={false}>
        <ReduxProvider store={storeRef.current}>
          <ReactQueryProvider>
            <CartProvider>
              <SiteTracker />
              {children}
            </CartProvider>
          </ReactQueryProvider>
        </ReduxProvider>
      </SessionProvider>
    </NextThemesProvider>
  );
};
