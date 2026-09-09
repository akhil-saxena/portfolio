export default {
  fetch(): Response {
    return new Response(
      'pool-main-stub: the workers Vitest project has no user Worker under test. ' +
        'HTTP assertions belong to the integration project, against astro preview.',
      { status: 501, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  },
};
