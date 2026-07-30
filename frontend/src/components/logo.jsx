const Logo = ({ className = "" }) => {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 256 256"
      fill="#192837"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M64 128 L64.5 128 L32 95 L0 64 L0 0 L64 0 L128 64 L128 64.5 L161 32 L192 0 L256 0 L256 64 L192 128 L128 128 L128 192 L96 223 L63.5 256 L0 256 L0 192 Z M256 192 L224 223 L191.5 256 L128 256 L128 192 L192 128 L256 128 Z" />
    </svg>
  );
};

export default Logo;