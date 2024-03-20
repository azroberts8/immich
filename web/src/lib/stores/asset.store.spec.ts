import { sdkMock } from '$lib/__mocks__/sdk.mock';
import { TimeBucketSize, type AssetResponseDto } from '@immich/sdk';
import { assetFactory } from '@test-data/factories/asset-factory';
import { AssetStore, BucketPosition } from './assets.store';

describe('AssetStore', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('init', () => {
    let assetStore: AssetStore;
    const bucketAssets: Record<string, AssetResponseDto[]> = {
      '2024-03-01T00:00:00.000Z': assetFactory.buildList(1),
      '2024-02-01T00:00:00.000Z': assetFactory.buildList(100),
      '2024-01-01T00:00:00.000Z': assetFactory.buildList(3),
    };

    beforeEach(async () => {
      assetStore = new AssetStore({});
      sdkMock.getTimeBuckets.mockResolvedValue([
        { count: 1, timeBucket: '2024-03-01T00:00:00.000Z' },
        { count: 100, timeBucket: '2024-02-01T00:00:00.000Z' },
        { count: 3, timeBucket: '2024-01-01T00:00:00.000Z' },
      ]);
      sdkMock.getTimeBucket.mockImplementation(({ timeBucket }) => Promise.resolve(bucketAssets[timeBucket]));

      await assetStore.init({ width: 1588, height: 1000 });
    });

    it('should load buckets in viewport', () => {
      expect(sdkMock.getTimeBuckets).toBeCalledTimes(1);
      expect(sdkMock.getTimeBuckets).toBeCalledWith({ size: TimeBucketSize.Month });
      expect(sdkMock.getTimeBucket).toHaveBeenCalledTimes(2);
    });

    it('calculates bucket height', () => {
      expect(assetStore.buckets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ bucketDate: '2024-03-01T00:00:00.000Z', bucketHeight: 235 }),
          expect.objectContaining({ bucketDate: '2024-02-01T00:00:00.000Z', bucketHeight: 3760 }),
          expect.objectContaining({ bucketDate: '2024-01-01T00:00:00.000Z', bucketHeight: 235 }),
        ]),
      );
    });

    it('calculates timeline height', () => {
      expect(assetStore.timelineHeight).toBe(4230);
    });
  });

  describe('loadBucket', () => {
    let assetStore: AssetStore;
    const bucketAssets: Record<string, AssetResponseDto[]> = {
      '2024-01-03T00:00:00.000Z': assetFactory.buildList(1),
      '2024-01-01T00:00:00.000Z': assetFactory.buildList(3),
    };

    beforeEach(async () => {
      assetStore = new AssetStore({});
      sdkMock.getTimeBuckets.mockResolvedValue([
        { count: 1, timeBucket: '2024-01-03T00:00:00.000Z' },
        { count: 3, timeBucket: '2024-01-01T00:00:00.000Z' },
      ]);
      sdkMock.getTimeBucket.mockImplementation(({ timeBucket }) => Promise.resolve(bucketAssets[timeBucket]));
      await assetStore.init({ width: 0, height: 0 });
    });

    it('loads a bucket', async () => {
      expect(assetStore.getBucketByDate('2024-01-01T00:00:00.000Z')?.assets.length).toEqual(0);
      await assetStore.loadBucket('2024-01-01T00:00:00.000Z', BucketPosition.Visible);
      expect(sdkMock.getTimeBucket).toBeCalledTimes(1);
      expect(assetStore.getBucketByDate('2024-01-01T00:00:00.000Z')?.assets.length).toEqual(3);
    });

    it('ignores invalid buckets', async () => {
      await assetStore.loadBucket('2023-01-01T00:00:00.000Z', BucketPosition.Visible);
      expect(sdkMock.getTimeBucket).toBeCalledTimes(0);
    });

    it('only updates the position of loaded buckets', async () => {
      await assetStore.loadBucket('2024-01-01T00:00:00.000Z', BucketPosition.Unknown);
      expect(assetStore.getBucketByDate('2024-01-01T00:00:00.000Z')?.position).toEqual(BucketPosition.Unknown);

      await assetStore.loadBucket('2024-01-01T00:00:00.000Z', BucketPosition.Visible);
      expect(assetStore.getBucketByDate('2024-01-01T00:00:00.000Z')?.position).toEqual(BucketPosition.Visible);
    });

    it('cancels bucket loading', async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
      const loadPromise = assetStore.loadBucket('2024-01-01T00:00:00.000Z', BucketPosition.Unknown);

      const bucket = assetStore.getBucketByDate('2024-01-01T00:00:00.000Z');
      expect(bucket).not.toBeNull();

      assetStore.cancelBucket(bucket!);
      expect(abortSpy).toBeCalledTimes(1);
      await loadPromise;
      expect(assetStore.getBucketByDate('2024-01-01T00:00:00.000Z')?.assets.length).toEqual(0);
    });
  });

  describe('addAssets', () => {
    let assetStore: AssetStore;

    beforeEach(async () => {
      assetStore = new AssetStore({});
      sdkMock.getTimeBuckets.mockResolvedValue([]);
      await assetStore.init({ width: 1588, height: 1000 });
    });

    it('is empty initially', () => {
      expect(assetStore.buckets.length).toEqual(0);
      expect(assetStore.assets.length).toEqual(0);
    });

    it('adds assets to new bucket', () => {
      const asset = assetFactory.build({ fileCreatedAt: '2024-01-20T12:00:00.000Z' });
      assetStore.addAssets([asset]);

      expect(assetStore.buckets.length).toEqual(1);
      expect(assetStore.assets.length).toEqual(1);
      expect(assetStore.buckets[0].assets.length).toEqual(1);
      expect(assetStore.buckets[0].bucketDate).toEqual('2024-01-01T00:00:00.000Z');
      expect(assetStore.assets[0].id).toEqual(asset.id);
    });

    it('adds assets to existing bucket', () => {
      const [assetOne, assetTwo] = assetFactory.buildList(2, { fileCreatedAt: '2024-01-20T12:00:00.000Z' });
      assetStore.addAssets([assetOne]);
      assetStore.addAssets([assetTwo]);

      expect(assetStore.buckets.length).toEqual(1);
      expect(assetStore.assets.length).toEqual(2);
      expect(assetStore.buckets[0].assets.length).toEqual(2);
      expect(assetStore.buckets[0].bucketDate).toEqual('2024-01-01T00:00:00.000Z');
    });

    it('orders assets in buckets by descending date', () => {
      const assetOne = assetFactory.build({ fileCreatedAt: '2024-01-20T12:00:00.000Z' });
      const assetTwo = assetFactory.build({ fileCreatedAt: '2024-01-15T12:00:00.000Z' });
      const assetThree = assetFactory.build({ fileCreatedAt: '2024-01-16T12:00:00.000Z' });
      assetStore.addAssets([assetOne, assetTwo, assetThree]);

      const bucket = assetStore.getBucketByDate('2024-01-01T00:00:00.000Z');
      expect(bucket).not.toBeNull();
      expect(bucket?.assets.length).toEqual(3);
      expect(bucket?.assets[0].id).toEqual(assetOne.id);
      expect(bucket?.assets[1].id).toEqual(assetThree.id);
      expect(bucket?.assets[2].id).toEqual(assetTwo.id);
    });

    it('orders buckets by descending date', () => {
      const assetOne = assetFactory.build({ fileCreatedAt: '2024-01-20T12:00:00.000Z' });
      const assetTwo = assetFactory.build({ fileCreatedAt: '2024-04-20T12:00:00.000Z' });
      const assetThree = assetFactory.build({ fileCreatedAt: '2023-01-20T12:00:00.000Z' });
      assetStore.addAssets([assetOne, assetTwo, assetThree]);

      expect(assetStore.buckets.length).toEqual(3);
      expect(assetStore.buckets[0].bucketDate).toEqual('2024-04-01T00:00:00.000Z');
      expect(assetStore.buckets[1].bucketDate).toEqual('2024-01-01T00:00:00.000Z');
      expect(assetStore.buckets[2].bucketDate).toEqual('2023-01-01T00:00:00.000Z');
    });

    it('updates existing asset', () => {
      const updateAssetsSpy = vi.spyOn(assetStore, 'updateAssets');
      const asset = assetFactory.build();
      assetStore.addAssets([asset]);

      assetStore.addAssets([asset]);
      expect(updateAssetsSpy).toBeCalledWith([asset]);
      expect(assetStore.assets.length).toEqual(1);
    });
  });

  describe('updateAssets', () => {
    let assetStore: AssetStore;

    beforeEach(async () => {
      assetStore = new AssetStore({});
      sdkMock.getTimeBuckets.mockResolvedValue([]);
      await assetStore.init({ width: 1588, height: 1000 });
    });

    it('ignores non-existing assets', () => {
      assetStore.updateAssets([assetFactory.build()]);

      expect(assetStore.buckets.length).toEqual(0);
      expect(assetStore.assets.length).toEqual(0);
    });

    it('updates an asset', () => {
      const asset = assetFactory.build({ isFavorite: false });
      const updatedAsset = { ...asset, isFavorite: true };

      assetStore.addAssets([asset]);
      expect(assetStore.assets.length).toEqual(1);
      expect(assetStore.assets[0].isFavorite).toEqual(false);

      assetStore.updateAssets([updatedAsset]);
      expect(assetStore.assets.length).toEqual(1);
      expect(assetStore.assets[0].isFavorite).toEqual(true);
    });

    it('replaces bucket date when asset date changes', () => {
      const asset = assetFactory.build({ fileCreatedAt: '2024-01-20T12:00:00.000Z' });
      const updatedAsset = { ...asset, fileCreatedAt: '2024-03-20T12:00:00.000Z' };

      assetStore.addAssets([asset]);
      expect(assetStore.buckets.length).toEqual(1);
      expect(assetStore.getBucketByDate('2024-01-01T00:00:00.000Z')).not.toBeNull();

      assetStore.updateAssets([updatedAsset]);
      expect(assetStore.buckets.length).toEqual(1);
      expect(assetStore.getBucketByDate('2024-01-01T00:00:00.000Z')).toBeNull();
      expect(assetStore.getBucketByDate('2024-03-01T00:00:00.000Z')).not.toBeNull();
    });
  });

  describe('removeAssets', () => {
    let assetStore: AssetStore;

    beforeEach(async () => {
      assetStore = new AssetStore({});
      sdkMock.getTimeBuckets.mockResolvedValue([]);
      await assetStore.init({ width: 1588, height: 1000 });
    });

    it('ignores invalid IDs', () => {
      assetStore.addAssets(assetFactory.buildList(2, { fileCreatedAt: '2024-01-20T12:00:00.000Z' }));
      assetStore.removeAssets(['', 'invalid', '4c7d9acc']);

      expect(assetStore.assets.length).toEqual(2);
      expect(assetStore.buckets.length).toEqual(1);
      expect(assetStore.buckets[0].assets.length).toEqual(2);
    });

    it('removes asset from bucket', () => {
      const [assetOne, assetTwo] = assetFactory.buildList(2, { fileCreatedAt: '2024-01-20T12:00:00.000Z' });
      assetStore.addAssets([assetOne, assetTwo]);
      assetStore.removeAssets([assetOne.id]);

      expect(assetStore.assets.length).toEqual(1);
      expect(assetStore.buckets.length).toEqual(1);
      expect(assetStore.buckets[0].assets.length).toEqual(1);
    });

    it('removes bucket when empty', () => {
      const assets = assetFactory.buildList(2, { fileCreatedAt: '2024-01-20T12:00:00.000Z' });
      assetStore.addAssets(assets);
      assetStore.removeAssets(assets.map((asset) => asset.id));

      expect(assetStore.assets.length).toEqual(0);
      expect(assetStore.buckets.length).toEqual(0);
    });
  });

  describe('getPreviousAssetId', () => {
    let assetStore: AssetStore;
    const bucketAssets: Record<string, AssetResponseDto[]> = {
      '2024-03-01T00:00:00.000Z': assetFactory.buildList(1),
      '2024-02-01T00:00:00.000Z': assetFactory.buildList(6),
      '2024-01-01T00:00:00.000Z': assetFactory.buildList(3),
    };

    beforeEach(async () => {
      assetStore = new AssetStore({});
      sdkMock.getTimeBuckets.mockResolvedValue([
        { count: 1, timeBucket: '2024-03-01T00:00:00.000Z' },
        { count: 6, timeBucket: '2024-02-01T00:00:00.000Z' },
        { count: 3, timeBucket: '2024-01-01T00:00:00.000Z' },
      ]);
      sdkMock.getTimeBucket.mockImplementation(({ timeBucket }) => Promise.resolve(bucketAssets[timeBucket]));

      await assetStore.init({ width: 0, height: 0 });
    });

    it('returns null for invalid assetId', async () => {
      expect(() => assetStore.getPreviousAssetId('invalid')).not.toThrow();
      expect(await assetStore.getPreviousAssetId('invalid')).toBeNull();
    });

    it('returns previous assetId', async () => {
      await assetStore.loadBucket('2024-01-01T00:00:00.000Z', BucketPosition.Visible);
      const bucket = assetStore.getBucketByDate('2024-01-01T00:00:00.000Z');

      expect(await assetStore.getPreviousAssetId(bucket!.assets[1].id)).toEqual(bucket!.assets[0].id);
    });

    it('returns previous assetId spanning multiple buckets', async () => {
      await assetStore.loadBucket('2024-02-01T00:00:00.000Z', BucketPosition.Visible);
      await assetStore.loadBucket('2024-03-01T00:00:00.000Z', BucketPosition.Visible);

      const bucket = assetStore.getBucketByDate('2024-02-01T00:00:00.000Z');
      const previousBucket = assetStore.getBucketByDate('2024-03-01T00:00:00.000Z');
      expect(await assetStore.getPreviousAssetId(bucket!.assets[0].id)).toEqual(previousBucket!.assets[0].id);
    });

    it('loads previous bucket', async () => {
      await assetStore.loadBucket('2024-02-01T00:00:00.000Z', BucketPosition.Visible);

      const loadBucketSpy = vi.spyOn(assetStore, 'loadBucket');
      const bucket = assetStore.getBucketByDate('2024-02-01T00:00:00.000Z');
      const previousBucket = assetStore.getBucketByDate('2024-03-01T00:00:00.000Z');
      expect(await assetStore.getPreviousAssetId(bucket!.assets[0].id)).toEqual(previousBucket!.assets[0].id);
      expect(loadBucketSpy).toBeCalledTimes(1);
    });

    it('skips removed assets', async () => {
      await assetStore.loadBucket('2024-01-01T00:00:00.000Z', BucketPosition.Visible);
      await assetStore.loadBucket('2024-02-01T00:00:00.000Z', BucketPosition.Visible);
      await assetStore.loadBucket('2024-03-01T00:00:00.000Z', BucketPosition.Visible);

      const [assetOne, assetTwo, assetThree] = assetStore.assets;
      assetStore.removeAssets([assetTwo.id]);
      expect(await assetStore.getPreviousAssetId(assetThree.id)).toEqual(assetOne.id);
    });

    it('returns null when no more assets', async () => {
      await assetStore.loadBucket('2024-03-01T00:00:00.000Z', BucketPosition.Visible);
      expect(await assetStore.getPreviousAssetId(assetStore.assets[0].id)).toBeNull();
    });
  });

  describe('getBucketIndexByAssetId', () => {
    let assetStore: AssetStore;

    beforeEach(async () => {
      assetStore = new AssetStore({});
      sdkMock.getTimeBuckets.mockResolvedValue([]);
      await assetStore.init({ width: 0, height: 0 });
    });

    it('returns null for invalid buckets', () => {
      expect(assetStore.getBucketByDate('invalid')).toBeNull();
      expect(assetStore.getBucketByDate('2024-03-01T00:00:00.000Z')).toBeNull();
    });

    it('returns the bucket index', () => {
      const assetOne = assetFactory.build({ fileCreatedAt: '2024-01-20T12:00:00.000Z' });
      const assetTwo = assetFactory.build({ fileCreatedAt: '2024-02-15T12:00:00.000Z' });
      assetStore.addAssets([assetOne, assetTwo]);

      expect(assetStore.getBucketIndexByAssetId(assetTwo.id)).toEqual(0);
      expect(assetStore.getBucketIndexByAssetId(assetOne.id)).toEqual(1);
    });

    it('ignores removed buckets', () => {
      const assetOne = assetFactory.build({ fileCreatedAt: '2024-01-20T12:00:00.000Z' });
      const assetTwo = assetFactory.build({ fileCreatedAt: '2024-02-15T12:00:00.000Z' });
      assetStore.addAssets([assetOne, assetTwo]);

      assetStore.removeAssets([assetTwo.id]);
      expect(assetStore.getBucketIndexByAssetId(assetOne.id)).toEqual(0);
    });
  });
});
