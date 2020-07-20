# number-vectors

![GloVe similarities of numbers 0 through 512](./img/similarities-512.png)

[Run this demo in browser](https://maxwells-daemons.github.io/number-vectors/)!

A small program to plot the semantic similarities of numbers using GloVe.
Numbers are well-ordered, so this produces a cohesive 2D plot, unlike other word vector visualizations.

## Cool things in the graph

Big blocks represent "size categories" people most often think in terms of:
 - 1 - 10
 - 11 - 31
 - 32 - 100
 - 100 - 200
 - 200 - 500
 - 500 - 1500 (after this, numbers mostly refer to years)

Similarly, with numbers used as years, there's a "cone" of increasing precision towards the present.
You can tell the model is based on the 2014 internet, because that's the tip of the cone.
The time periods people seem to use are:
 - 1500 - 1770
 - 1800 - 1920
 - Precision smoothly increases from 1920 to 2014, except 2000, which stands on its own
 - The future is 2015 - 2062. Everything beyond that is hard to interpret, probably because those numbers don't get used often.

Grid patterns indicate "levels of precision." For example, multiples of 10 (and multiples of 1000) are all considered similar.

Certain numbers are important unto themselves:
 - 0
 - 100, 500, 1000
 - 737 and 747 (models of planes)
 - 911 (the emergency phone number)
 - 925 (a type of silver, I think?)
 - 256, 512, 1024, 2048 (powers of 2)
 - 1099 (a tax form)
 - 1337 (1337 h4x0r)
 - 1394 (an IEEE standard)
 - 1492 (when Columbus sailed the ocean blue)

See something neat? Submit a PR!

## Model

This project uses [Stanford NLP's GloVe vectors](https://nlp.stanford.edu/projects/glove/) through spaCy,
trained on Common Crawl 2014.

## Usage

`poetry run numbers.py --help`
