export default function HandheldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#e7ecef]">{children}</div>;
}