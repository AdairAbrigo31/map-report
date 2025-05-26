<script lang="ts">
    let countries: Array<string> = ["Ecuador", "Italia"];
    let countrieSelect = countries[0];
    let fileInput: HTMLInputElement;
    let filecsv : File | null;

    $: if (filecsv) {
        console.log(filecsv.name);
    }

    function updateFile () {
        console.log(fileInput.files)
        filecsv = fileInput?.files?.[0] || null;
    }

</script>

<main class="m-3">
    <h2>
        Bienvenido , aquí podras realizar tus reportes usando mapas de distintos
        paises
    </h2>
    <select class="form-select" bind:value={countrieSelect}>
        {#each countries as value}
            <option {value}> {value} </option>
        {/each}
    </select>
    <div class="row mt-3 mb-3">

        <div class="col-8 container-map"> Mapa</div>

        <div class="col">
            <label for='form-label' class="form-label">Cargue su archivo csv siguiendo el formato indicado</label>
            <input class="form-control" type="file" id="formFile" accept=".geojson" bind:this={fileInput} on:input={updateFile}>
        </div>
    </div>



</main>
