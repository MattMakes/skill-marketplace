# Prompt-writing rules for diffusion image prompts

General rules for writing prompts to a text-to-image model, plus the exact output shape this
skill emits. These rules apply to any diffusion-style image model; no vendor-specific syntax is
assumed.

## General rules

1. **Describe style in words, never by naming a living artist, studio or copyrighted
   character.** Use medium, era, palette, lighting and composition words instead:
   "gouache painting", "1990s Saturday-morning cartoon", "warm desert palette, long shadows",
   "flat vector shapes, no gradients".
2. **Front-load the subject**, then style, then composition/lighting, then quality tags last.
   Example order: subject → action/pose → setting → style → lighting → composition.
3. **Be concrete, not vague.** "A small fox made of folded paper, mid-leap, in a sunlit paper
   diorama forest" beats "cute fox game art".
4. **One clear subject per prompt.** A prompt trying to show two unrelated ideas at once produces
   a muddled image; split it into two prompts instead.
5. **Negative prompts remove failure modes, not just unwanted content.** List things the model
   commonly gets wrong for this style (e.g. "extra limbs, warped text, blurry") alongside the
   fixed content-boundary negatives.
6. **State size/aspect ratio explicitly.** Default to `1024x1024` unless the shot calls for a
   different ratio (e.g. a wide vista as `1536x1024`).

## Fixed content-boundary negatives

Every prompt's `negative_prompt` must include these, verbatim, in addition to any
concept-specific negatives:

```
weapons, blood, gore, nudity, sexual content, casino imagery, gambling imagery
```

## Output JSON shape

```json
{
  "style_sheet": {
    "palette": [
      { "hex": "#2b2d42", "role": "primary" },
      { "hex": "#edf2f4", "role": "background" },
      { "hex": "#ef8354", "role": "accent" }
    ],
    "shape_language": "Soft, rounded silhouettes with simple geometric props; reads clearly at small size.",
    "lighting": "Warm late-afternoon light, low contrast, single soft key.",
    "texture": "Flat vector shapes with a light paper-grain overlay, no gradients.",
    "references_in_words": ["1970s children's book illustration", "matte-painted golden-hour skies"]
  },
  "shot_list": [
    { "aesthetic": "Sensation", "shot": "The fire flaring as fuel is dropped in, embers scattering." },
    { "aesthetic": "Discovery", "shot": "A wide vista of the garden half-revealed by firelight." }
  ],
  "prompts": [
    {
      "name": "key-art",
      "prompt": "A small fire in the center of a dark garden, warm light spreading outward across leaves and flowers, flat vector illustration, soft rounded shapes, warm late-afternoon palette",
      "negative_prompt": "text, watermark, blurry, extra limbs, weapons, blood, gore, nudity, sexual content, casino imagery, gambling imagery",
      "size": "1024x1024",
      "style": "flat vector, soft rounded shapes, warm palette"
    },
    {
      "name": "hero",
      "prompt": "A gardener character kneeling beside a small campfire, gentle expression, flat vector illustration, rounded silhouette, warm palette",
      "negative_prompt": "text, watermark, blurry, extra limbs, warped hands, weapons, blood, gore, nudity, sexual content, casino imagery, gambling imagery",
      "size": "1024x1024",
      "style": "flat vector, soft rounded shapes, warm palette"
    },
    {
      "name": "gameplay-mock",
      "prompt": "Top-down mockup of a garden game screen, a glowing fire at center, dark unlit garden tiles around the edges, simple UI icons for fuel count, flat vector illustration",
      "negative_prompt": "text, watermark, blurry, distorted UI, weapons, blood, gore, nudity, sexual content, casino imagery, gambling imagery",
      "size": "1024x1024",
      "style": "flat vector, soft rounded shapes, warm palette"
    }
  ],
  "deliverable_note": "The style sheet is the deliverable. The 3 images are placeholders only and may be skipped without failing the brief."
}
```
