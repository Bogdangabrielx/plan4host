// /components/consent/OpenCookieSettingsButton.tsx
"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
};

export default function OpenCookieSettingsButton({
  label = "Cookie settings",
  className,
  ...props
}: Props) {
  function open(e?: React.MouseEvent) {
    e?.preventDefault();
    try {
      window.dispatchEvent(new CustomEvent("p4h:open-cookie-settings"));
    } catch {}
  }

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={open}
      className={className}
      {...props}
    >
      {label}
    </button>
  );
}