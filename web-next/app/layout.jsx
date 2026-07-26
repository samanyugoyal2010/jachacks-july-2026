import "./globals.css";
import Nav from "../components/Nav";

export const metadata = {
  title: "Glass Box — auditable lending decisions",
  description: "Apply for a loan and see exactly how the decision was made — plus how to fix a denial.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
