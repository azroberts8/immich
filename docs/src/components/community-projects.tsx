import Link from '@docusaurus/Link';
import React from 'react';

interface CommunityProjectProps {
  title: string;
  description: string;
  url: string;
}

const projects: CommunityProjectProps[] = [
  {
    title: 'immich-go',
    description: `An alternative to the immich-CLI command that doesn't depend on nodejs installation. It tries its best for importing google photos takeout archives.`,
    url: 'https://github.com/simulot/immich-go',
  },
  {
    title: 'ImmichFrame',
    description: 'Run an Immich slideshow in a photo frame.',
    url: 'https://github.com/3rob3/ImmichFrame',
  },
  {
    title: 'API Album Sync',
    description: 'A Python script to sync folders as albums.',
    url: 'https://git.orenit.solutions/open/immichalbumpull',
  },
  {
    title: 'Remove offline files',
    description: 'A Python script to remove offline files.',
    url: 'https://gist.github.com/Thoroslives/ca5d8e1efd15111febc1e7b34ac72668',
  },
  {
    title: 'Create albums from folders',
    description: 'A Python script to create albums based on the folder structure of an external library.',
    url: 'https://github.com/Salvoxia/immich-folder-album-creator',
  },
  {
    title: 'Podman/Quadlets Install',
    description: 'Documentation for simple podman setup using quadlets.',
    url: 'https://github.com/tbelway/immich-podman-quadlets/blob/main/docs/install/podman-quadlet.md',
  },
  {
    title: 'Lightroom Publisher: mi.Immich.Publisher',
    description: 'Lightroom plugin to publish photos from Lightroom collections to Immich albums.',
    url: 'https://github.com/midzelis/mi.Immich.Publisher',
  },
  {
    title: 'Immich Duplicate Finder',
    description: 'Webapp that uses machine learning to identify near-duplicate images.',
    url: 'https://github.com/vale46n1/immich_duplicate_finder',
  },
];

function CommunityProject({ title, description, url }: CommunityProjectProps): JSX.Element {
  return (
    <section className="flex flex-col gap-4 justify-between dark:bg-immich-dark-gray bg-immich-gray dark:border-0 border-gray-200 border border-solid rounded-2xl p-4">
      <div className="flex flex-col gap-2">
        <p className="m-0 items-start flex gap-2">
          <span>{title}</span>
        </p>

        <p className="m-0 text-sm text-gray-600 dark:text-gray-300">{description}</p>
        <p className="m-0 text-sm text-gray-600 dark:text-gray-300">
          <a href={url}>{url}</a>
        </p>
      </div>
      <div className="flex">
        <Link
          className="px-4 py-2 bg-immich-primary/10 dark:bg-gray-300  rounded-full hover:no-underline text-immich-primary dark:text-immich-dark-bg font-bold uppercase"
          to={url}
        >
          View Project
        </Link>
      </div>
    </section>
  );
}

export default function CommunityProjects(): JSX.Element {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {projects.map((project) => (
        <CommunityProject {...project} />
      ))}
    </div>
  );
}
