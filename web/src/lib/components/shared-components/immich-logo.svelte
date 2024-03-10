<script lang="ts">
  import immichLogoUrl from '$lib/assets/photos-logo.svg';

  export let draggable = false;
</script>

<img src={immichLogoUrl} alt="Photos Logo" {draggable} {...$$restProps} />
