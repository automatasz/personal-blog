<script lang="ts">
  type Image = {
    file: File;
    preview: string;
    keywords: string[];
    title: string;
    isLoading: boolean;
  };

  let files: FileList | null = $state(null);
  let images: Array<Image> = $state([]);

  $effect(() => {
    if (!files) {
      return;
    }

    for (const file of files) {
      const preview = URL.createObjectURL(file);
      const newImage = {
        file,
        preview,
        keywords: [],
        title: "",
        isLoading: true,
      };

      if (!images.find((image) => image.file.name === file.name)) {
        images.push(newImage);
        generateKeywords(newImage.file);
      }
    }
  });

  const generateKeywords = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/describe/", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error generating keywords:", error);
    }
  };
</script>

<form>
  <div class="mb-6">
    <label class="block text-sm font-medium mb-2">
      Upload Images
      <input
        name="files"
        id="files"
        type="file"
        accept="image/*"
        multiple
        bind:files
        class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
    </label>
  </div>
</form>
