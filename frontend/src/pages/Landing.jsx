import Navbar from "../components/Navbar";
import Hero from "../components/Hero";

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 z-0 w-full h-full object-cover"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260606_131516_eca35265-ea66-4fbd-8d52-22aae6e1a503.mp4"
          type="video/mp4"
        />
      </video>

      {/* Light overlay */}
      <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px]" />

      <Navbar />

      <Hero />
    </div>
  );
}