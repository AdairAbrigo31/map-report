<script lang="ts">
    let countries: Array<string> = ["Ecuador", "Italia"];
    let countrieSelect = countries[0];
</script>

<main>
    <h2>
        Bienvenido , aquí podras realizar tus reportes usando mapas de distintos
        paises
    </h2>
    <select class="form-select" bind:value={countrieSelect}>
        {#each countries as value}
            <option {value}> {value} </option>
        {/each}
    </select>
    <div class="container-map"></div>
    <div class="container-charge-csv">
        <h3>Cargue su csv</h3>
    </div>
</main>
