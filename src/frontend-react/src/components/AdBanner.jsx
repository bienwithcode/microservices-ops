export default function AdBanner({ ad }) {
  if (!ad) return null;

  return (
    <div className="ad">
      <div className="container py-3 px-lg-5 py-lg-5">
        <div role="alert">
          <strong>Ad</strong>
          <a
            href={ad.redirectUrl}
            rel="nofollow noopener noreferrer"
            target="_blank"
          >
            {ad.text}
          </a>
        </div>
      </div>
    </div>
  );
}
