import bokeh
import bokeh.plotting
import click
import en_core_web_md
import matplotlib.pyplot as plt
import numpy as np


@click.command()
@click.option("--max-number", default=256, help="Maximum number to plot.", type=int)
@click.option(
    "--interact/--no-interact", default=True, help="Run an in-browser interactive plot."
)
@click.option("--output-image/--no-output-image", default=False)
@click.option(
    "--output-html/--no-output-html",
    default=False,
    help="Write a standalone HTML document.",
)
@click.option(
    "--output-components/--no-output-components",
    default=False,
    help="Write javascript and an HTML document for embedding.",
)
def main(
    max_number: int,
    interact: bool,
    output_image: bool,
    output_html: bool,
    output_components: bool,
):
    if max_number < 1:
        raise ValueError("max-number must be positive")

    click.echo("Computing vectors")
    vocab = en_core_web_md.load()
    numbers = np.arange(0, max_number + 1, dtype=int)
    vectors = np.array([vocab(str(i)).vector for i in numbers])

    click.echo("Computing similarities")
    prod = np.matmul(vectors, vectors.T)
    norms = np.linalg.norm(vectors, axis=1)
    norms_outer = np.outer(norms, norms)
    similarities = prod / norms_outer

    if output_image:
        file_name = f"./similarities-{max_number}.png"
        click.echo(f"Writing plot to {file_name}")
        fig, ax = plt.subplots(figsize=(1, 1))
        ax.imshow(similarities, cmap="inferno")
        plt.subplots_adjust(left=0, right=1, bottom=0, top=1)
        plt.savefig(file_name, dpi=max_number)

    if interact or output_html or output_components:
        fig = bokeh.plotting.figure(
            tooltips=[("x", "$x{int}"), ("y", "$y{int}"), ("value", "@image")],
            active_scroll="wheel_zoom",
            sizing_mode="scale_both",
        )
        fig.x_range.range_padding = fig.y_range.range_padding = 0

        # Offsets ensure that the hover tooltip is always right
        fig.image(
            image=[similarities],
            x=-0.5,
            y=-0.5,
            dw=max_number + 1,
            dh=max_number + 1,
            palette=bokeh.palettes.Inferno256,
        )

    if interact:
        click.echo("Launching browser demo")
        bokeh.plotting.show(fig)

    if output_html:
        file_name = f"./similarities-{max_number}.html"
        click.echo(f"Writing standalone HTML document to {file_name}")
        html = bokeh.embed.file_html(
            fig, bokeh.resources.CDN, f"GloVe Similarities of Numbers 0 - {max_number}"
        )
        with open(file_name, "w+") as f:
            f.write(html)

    if output_components:
        file_js = f"./similarities-{max_number}.js"
        file_html = f"./similarities-{max_number}-div.html"
        click.echo(f"Writing embedding components to {file_js} and {file_html}")
        script, html = bokeh.embed.components(fig)
        with open(file_js, "w+") as f:
            f.write(script)
        with open(file_html, "w+") as f:
            f.write(html)

    click.echo("Done!")


if __name__ == "__main__":
    main()
