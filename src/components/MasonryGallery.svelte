<script lang="ts">
  import type { OptimizedImage } from "@/types/masonry-gallery";
  import PhotoSwipeLightbox from "photoswipe/lightbox";
  import { onMount } from "svelte";

  const { imageList, breakpoints }: { imageList: OptimizedImage[]; breakpoints: Record<number, number> } = $props();
  let images: OptimizedImage[][] = $state([]);

  function splitImageArray(columnCount: number) {
    if (columnCount < 2) {
      return [imageList];
    }

    const list = imageList
      .filter((image) => image.width && image.height)
      .map((image) => ({
        ...image,
        aspectRatio: image.height / image.width,
      }));

    const columns = Array.from({ length: columnCount }, () => Array<OptimizedImage>());
    const columnAspectSums = Array<number>(columnCount).fill(0);

    for (const image of list) {
      const targetColumnIndex = columnAspectSums.indexOf(Math.min(...columnAspectSums));
      columns[targetColumnIndex].push(image);
      columnAspectSums[targetColumnIndex] += image.aspectRatio;
    }

    return columns;
  }

  function handleResize(width: number) {
    const sortedBreakpoints = Object.keys(breakpoints)
      .map(Number)
      .sort((a, b) => b - a);

    for (const breakpoint of sortedBreakpoints) {
      if (width >= breakpoint) {
        images = splitImageArray(breakpoints[breakpoint]);
        return;
      }
    }

    images = splitImageArray(1);
  }

  onMount(() => {
    const lightbox = new PhotoSwipeLightbox({
      gallery: "#gallery",
      children: "a",
      closeSVG:
        '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M480-424 284-228q-11 11-28 11t-28-11q-11-11-11-28t11-28l196-196-196-196q-11-11-11-28t11-28q11-11 28-11t28 11l196 196 196-196q11-11 28-11t28 11q11 11 11 28t-11 28L536-480l196 196q11 11 11 28t-11 28q-11 11-28 11t-28-11L480-424Z"/></svg>',
      zoomSVG:
        '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M340-540h-40q-17 0-28.5-11.5T260-580q0-17 11.5-28.5T300-620h40v-40q0-17 11.5-28.5T380-700q17 0 28.5 11.5T420-660v40h40q17 0 28.5 11.5T500-580q0 17-11.5 28.5T460-540h-40v40q0 17-11.5 28.5T380-460q-17 0-28.5-11.5T340-500v-40Zm40 220q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l224 224q11 11 11 28t-11 28q-11 11-28 11t-28-11L532-372q-30 24-69 38t-83 14Zm0-80q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>',
      padding: { top: 20, bottom: 20, left: 20, right: 20 },
      wheelToZoom: true,
      arrowPrev: false,
      arrowNext: false,
      imageClickAction: "close",
      tapAction: "close",
      doubleTapAction: "zoom",
      pswpModule: () => import("photoswipe"),
    });

    lightbox.init();

    const gallery = document.getElementById("gallery");
    if (gallery) {
      handleResize(gallery.clientWidth);
    }

    const eventHandler = () => {
      const gallery = document.getElementById("gallery");
      if (gallery) {
        handleResize(gallery.clientWidth);
      }
    };

    window.addEventListener("resize", () => {
      const gallery = document.getElementById("gallery");
      if (gallery) {
        handleResize(gallery.clientWidth);
      }
    });

    return () => {
      window.removeEventListener("resize", eventHandler);
      lightbox.destroy();
    };
  });

  const columnMapping = (columnCount: number) => {
    switch (columnCount) {
      case 4:
        return "grid-cols-4";
      case 3:
        return "grid-cols-3";
      case 2:
        return "grid-cols-2";
      default:
        return "grid-cols-1";
    }
  };
</script>

<div class={`grid ${columnMapping(images.length)} gap-4 pswp-gallery mt-2.5`} id="gallery">
  {#each images as imageColumn (imageColumn)}
    <div class="flex flex-col gap-4">
      {#each imageColumn as image (image)}
        <a
          class="group relative h-auto w-full overflow-hidden rounded-lg cursor-zoom-in"
          href={image.src}
          target="_blank"
          rel="noreferrer"
          data-pswp-height={image.height}
          data-pswp-width={image.width}
          data-pswp-srcset={image.srcSet}
        >
          <img
            class="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-110"
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            srcset={image.srcSet}
            sizes={image.sizes}
            loading="lazy"
          />
        </a>
      {/each}
    </div>
  {/each}
</div>
