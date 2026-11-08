import Image from 'next/image';
import mark from '@/public/brand/aura-mark.webp';

/** Tanda logo saja (gambar). Dekoratif: teks "AURA" di sebelahnya yang dibaca pembaca layar. */
export function LogoMark({ size = 40, priority = false }) {
  const width = Math.round((size * mark.width) / mark.height);
  return <Image src={mark} alt="" aria-hidden="true" width={width} height={size} priority={priority} />;
}

/** Logo lengkap: tanda berupa gambar, nama dan tagline berupa teks asli (bisa dipilih, dibaca, dan diterjemahkan). */
export function LogoLockup({ size = 112, priority = false }) {
  return (
    <div className="lockup">
      <LogoMark size={size} priority={priority} />
      <div className="lockup-text">
        <span className="lockup-name">AURA</span>
        <span className="lockup-tag">Automated Rupiah Assistant</span>
      </div>
    </div>
  );
}
