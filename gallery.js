import { masonryLayout } from './masonry.js';
import { animateContours } from './contours.js';

const waterfall = document.querySelector('#waterfall');
const moreImages = document.querySelector('#more-images');
const status = document.querySelector('#gallery-status');
const batchSize = 36;
const imageBuffer = '480px 0px';

animateContours(document.querySelector('#contours'));

function shuffle(images) {
  for (let index = images.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [images[index], images[other]] = [images[other], images[index]];
  }
}

function mountImage(tile, image) {
  if (tile.childElementCount) return;

  let preview;
  if (image.preview) {
    preview = document.createElement('img');
    preview.className = 'gallery-preview';
    preview.alt = '';
    preview.fetchPriority = 'high';
    preview.addEventListener('error', () => preview.remove(), { once: true });
    tile.append(preview);
    preview.src = image.preview;
  }

  const photo = document.createElement('img');
  photo.className = 'gallery-photo';
  photo.alt = image.alt;
  photo.decoding = 'async';
  tile.append(photo);
  photo.src = image.src;
  photo.decode().then(() => {
    if (photo.parentElement !== tile) return;
    photo.classList.add('is-loaded');
    preview?.remove();
  }).catch(() => {
    // Keep the preview visible if the color image fails or leaves the viewport.
  });
}

function unmountImage(tile) {
  for (const image of tile.children) image.removeAttribute('src');
  tile.replaceChildren();
}

async function openGallery() {
  const response = await fetch('./gallery.json');
  if (!response.ok) throw new Error('Gallery data is unavailable.');
  const images = await response.json();
  shuffle(images);

  const visible = [];
  const tiles = [];
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) appendImages();
  }, { rootMargin: '800px 0px' });
  const imageObserver = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) mountImage(target, images[Number(target.dataset.index)]);
      else unmountImage(target);
    }
  }, { rootMargin: imageBuffer });

  function layout() {
    const width = waterfall.clientWidth;
    const result = masonryLayout(visible, width, width < 560 ? 10 : 16);
    result.items.forEach(({ left, top, width, height }, index) => {
      const tile = tiles[index];
      tile.style.width = `${width}px`;
      tile.style.height = `${height}px`;
      tile.style.transform = `translate(${left}px, ${top}px)`;
    });
    waterfall.style.height = `${result.height}px`;
  }

  function appendImages() {
    const fragment = document.createDocumentFragment();
    const added = [];
    for (const image of images.slice(visible.length, visible.length + batchSize)) {
      const tile = document.createElement('div');
      tile.className = 'gallery-tile';
      tile.dataset.index = String(visible.length);
      tiles.push(tile);
      visible.push(image);
      added.push(tile);
      fragment.append(tile);
    }
    waterfall.append(fragment);
    layout();
    for (const tile of added) imageObserver.observe(tile);
    observer.disconnect();
    if (visible.length < images.length) observer.observe(moreImages);
  }

  appendImages();
  new ResizeObserver(layout).observe(waterfall);
}

openGallery().catch(() => {
  status.textContent = 'The gallery could not load. Please refresh to try again.';
  status.hidden = false;
});
