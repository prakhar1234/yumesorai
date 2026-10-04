import type { Metadata } from 'next';
import { BusinessReviewClient } from '@/components/demystifier/BusinessReviewClient';

export const metadata: Metadata = {
  title: 'Business Review | Yumesorai',
  description: 'Highlight COBOL code sections and get plain-English business logic summaries',
};

export default function BusinessReviewPage() {
  return <BusinessReviewClient />;
}
