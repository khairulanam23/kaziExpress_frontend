import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media";

const GRADIENTS = [
  "from-[#3D5AFE] to-[#2FA8F0]",
  "from-[#10B7BE] to-[#3D5AFE]",
  "from-[#8B7BFF] to-[#10B7BE]",
  "from-[#2FA8F0] to-[#8B7BFF]",
  "from-[#F0A020] to-[#F0475F]",
  "from-[#16A672] to-[#2FA8F0]",
];

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function InitialsAvatar({
  name,
  className,
  size = "size-9",
}: {
  name: string;
  className?: string;
  size?: string;
}) {
  const gradient = GRADIENTS[hashString(name) % GRADIENTS.length];
  return (
    <Avatar className={cn(size, className)}>
      <AvatarFallback className={cn("bg-linear-to-br text-white", gradient)}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function ProductThumb({
  name,
  imageUrl,
  className,
  size = "size-11",
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
  size?: string;
}) {
  const [imgError, setImgError] = React.useState(false);
  const gradient = GRADIENTS[hashString(name) % GRADIENTS.length];
  const src = resolveMediaUrl(imageUrl);

  if (src && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={cn("shrink-0 object-cover rounded-xl", size, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-xs font-semibold text-white",
        gradient,
        size,
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}

/**
 * Large product media for a catalogue card.
 *
 * Shares the hash, gradient and initials helpers with `ProductThumb`, so a
 * product looks the same in a card as it does in a table row. The container
 * owns the aspect ratio and the image is cover-fitted inside it, so wildly
 * different source dimensions can never knock a grid of cards out of
 * alignment.
 */
export function ProductMedia({
  name,
  imageUrl,
  className,
  aspect = "aspect-[4/3]",
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
  aspect?: string;
}) {
  const [imgError, setImgError] = React.useState(false);
  const gradient = GRADIENTS[hashString(name) % GRADIENTS.length];
  const src = resolveMediaUrl(imageUrl);
  const showImage = !!src && !imgError;

  return (
    <div className={cn("bg-muted relative w-full overflow-hidden", aspect, className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? undefined}
          alt={name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        // Most inventory has no photograph, so the fallback sits on a neutral
        // ground with the gradient contained to a tile. Filling the whole frame
        // with saturated colour turned a page of cards into a wall of swatches
        // and buried the information underneath it.
        <div className="flex size-full items-center justify-center" aria-hidden>
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-xl bg-linear-to-br shadow-sm",
              gradient,
            )}
          >
            <span className="text-sm font-semibold tracking-wide text-white">{initials(name)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Round avatar that shows a real profile photo when one exists and falls back
 * to deterministic gradient initials otherwise, so a list of people always
 * reads as faces rather than empty circles.
 */
export function UserAvatar({
  name,
  imageUrl,
  size = "size-10",
  className,
  ring = false,
}: {
  name: string;
  imageUrl?: string | null;
  size?: string;
  className?: string;
  ring?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  const gradient = GRADIENTS[hashString(name) % GRADIENTS.length];
  const shell = cn("shrink-0 rounded-full object-cover", size, ring && "ring-2 ring-card", className);
  const src = resolveMediaUrl(imageUrl);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from the API host, not the Next image pipeline
      <img src={src} alt={`${name}'s profile photo`} onError={() => setFailed(true)} className={shell} />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-linear-to-br font-semibold text-white",
        gradient,
        shell,
      )}
      role="img"
      aria-label={`${name}'s initials`}
    >
      {initials(name)}
    </div>
  );
}
