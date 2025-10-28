import '@testing-library/jest-dom';

// Polyfill Response.json for Next.js
if (typeof Response !== 'undefined' && !Response.json) {
  Response.json = function (data, init) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  };
}
