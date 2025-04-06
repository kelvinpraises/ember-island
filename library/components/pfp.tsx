import Image from "next/image";
const blurhash = "LGIY5?t7~qWB-;M{WAof4nxuofj[";

export function PFP({
  pfp,
  size = 32,
}: {
  pfp: string | undefined;
  size?: number;
}) {
  const imageSettings = `/anim=false,fit=contain,width=${size * 2},height=${
    size * 2
  }`;

  let imageUrl:
    | string
    | undefined = `https://wrpcd.net/cdn-cgi/image${imageSettings}/${pfp}`;
  if (imageUrl.includes("imagedelivery.net")) {
    imageUrl = pfp?.replace("/original", imageSettings);
  }

  return (
    <div style={{ width: size, height: size }} className="relative">
      <Image
        src={imageUrl ?? ""}
        alt="pfp"
        className="rounded-full object-cover"
        placeholder="blur"
        blurDataURL={blurhash}
        fill
        sizes={`${size}px`}
      />
    </div>
  );
}
