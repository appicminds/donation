import type { Metadata } from "next";
import { PhotoForm } from "@/components/forms/Forms";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { Notice } from "@/components/ui/Notice";
import { PageHero } from "@/components/ui/PageHero";
import { galleryPage } from "@/content/copy";
import { getGalleryPhotos, getHomeCopy, getSiteSettings } from "@/lib/cms";

export const metadata: Metadata = { title: galleryPage.title, description: galleryPage.intro };

/** Gallery (PRD §11.3). Family-approved photographs with an accessible lightbox. */
export default async function GalleryPage() {
  const [galleryPhotos, settings, home] = await Promise.all([getGalleryPhotos(), getSiteSettings(), getHomeCopy()]);
  return (
    <>
      <PageHero eyebrow="Photo Gallery" title={galleryPage.title}>
        <p>{galleryPage.intro}</p>
      </PageHero>
      <div className="mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {galleryPhotos.length === 0 ? (
          <p className="mx-auto max-w-2xl rounded-2xl border border-dashed border-violet/30 px-6 py-12 text-center font-display text-2xl text-ink/80 italic">
            {home.gallery.empty}
          </p>
        ) : (
          <GalleryGrid photos={galleryPhotos} />
        )}
        <div className="mx-auto mt-16 max-w-2xl">
          <h2 id="share-photo-title" className="text-3xl text-ink">
            Share a Photograph
          </h2>
          <p className="mt-3 text-ink/80">
            Photographs are reviewed by the family before they appear. Please share only photographs you have permission
            to post.
          </p>
          {settings.flags.photoSubmissionsEnabled ? (
            <div className="mt-8">
              <PhotoForm />
            </div>
          ) : (
            <Notice className="mt-6">Photo sharing will open soon. Thank you for your patience.</Notice>
          )}
        </div>
      </div>
    </>
  );
}
