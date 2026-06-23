import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <p className="text-[13px] font-semibold text-muted">404</p>
        <h1 className="mt-2 text-2xl font-bold">This page is out of stock.</h1>
        <Link href="/en" className="mt-5 inline-flex h-12 items-center rounded-btn bg-volt px-6 font-semibold text-white hover:bg-volt-deep">
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
