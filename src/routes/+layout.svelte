<script lang="ts">
	let { children } = $props();
</script>

<nav>
	<a href="/">Home</a>
	<a href="/melanie">Melanie</a>
</nav>

{@render children()}