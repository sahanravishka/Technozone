'use client';
export default function PrintButton() {
  return (
    <button onClick={() => window.print()}
      className="pressable rounded-btn bg-volt px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-volt-deep print:hidden">
      🖨 Print A4 sheet
    </button>
  );
}
