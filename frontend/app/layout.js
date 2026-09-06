import './globals.css';

export const metadata = {
  title: 'LAMS – MR_LUPEX99',
  description: 'Lupex Agribusiness Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="sw">
      <body>{children}</body>
    </html>
  );
}
