import "./globals.css";
import PropTypes from "prop-types";
import { Navbar } from "@/components/Navbar";
import { auth } from "@/auth";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata = {
  title: "Network Traffic Analysis",
  description: "Professional traffic analysis platform",
};

RootLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col">
        <ThemeProvider>
          {session && <Navbar user={session.user} />}
          <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 pt-1">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
