// netlify/functions/saveVenta.js
import fetch from "node-fetch";

export async function handler(event) {
  try {
    const { venta } = JSON.parse(event.body);

    if (!venta) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Falta el objeto venta" }),
      };
    }

    const repo = "Joel014/sistema-ventas-agua";
    const path = "ventas.json";
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

    // Token seguro en Netlify
    const token = process.env.GITHUB_TOKEN;

    // Obtener archivo actual
    const response = await fetch(apiUrl, {
      headers: { Authorization: `token ${token}` },
    });

    const data = await response.json();
    let ventas = [];

    if (data.content) {
      const decoded = Buffer.from(data.content, "base64").toString("utf-8");
      ventas = JSON.parse(decoded);
    }

    // Agregar nueva venta
    ventas.push(venta);

    const updatedContent = Buffer.from(JSON.stringify(ventas, null, 2)).toString("base64");

    // Guardar en GitHub
    const saveResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Agregar nueva venta desde Netlify Function",
        content: updatedContent,
        sha: data.sha,
      }),
    });

    const result = await saveResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Venta guardada", result }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
