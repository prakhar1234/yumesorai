import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demystifier Platform | Yumesorai',
  description: 'COBOL knowledge graph explorer, change workflow, and modernization transformer',
};

export default function DemystifierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="demystifier-root min-h-screen bg-[#0a0e14] text-[#dbe4f0]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {children}
    </div>
  );
}
