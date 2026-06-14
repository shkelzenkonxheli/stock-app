import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

async function getLogoDataUrl() {
  const logoPath = path.join(process.cwd(), "public", "logo.jpg");
  const logoBuffer = await readFile(logoPath);

  return `data:image/jpeg;base64,${logoBuffer.toString("base64")}`;
}

export default async function Icon() {
  const logoSrc = await getLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(180deg, rgb(248,250,252) 0%, rgb(226,232,240) 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 408,
            height: 408,
            borderRadius: 96,
            background: "#ffffff",
            boxShadow: "0 30px 60px rgba(15,23,42,0.16)",
            alignItems: "center",
            justifyContent: "center",
            border: "8px solid rgba(148,163,184,0.18)",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="Stock App"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
              borderRadius: 88,
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
