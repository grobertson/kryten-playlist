"""Quick comparison script for different LLM models."""

import asyncio
import json
import os
import sqlite3

import httpx

SYSTEM_PROMPT = """You are a movie and TV show metadata expert. Given a title, provide structured metadata.

IMPORTANT RULES:
1. If you're not confident about specific details (cast, director), leave them as null rather than guessing.
2. For synopsis, write 1-2 sentences that capture the essence without spoilers.
3. For tags, include 3-8 relevant tags covering genre, themes, tone, and notable aspects.
4. For era, use decade format like "1980s", "2010s", or "classic" for pre-1970.
5. For mood, choose from: dark, light, comedic, dramatic, thrilling, heartwarming, disturbing, nostalgic, action-packed, cerebral, absurd, campy.
6. For content_rating, use MPAA (G, PG, PG-13, R, NC-17) for movies or TV ratings (TV-G, TV-PG, TV-14, TV-MA) for shows.

Respond ONLY with valid JSON matching this schema:
{
    "synopsis": "Brief 1-2 sentence description",
    "cast_list": ["Actor Name", ...] or null,
    "director": "Director Name" or null,
    "genre": "Primary genre",
    "mood": "One of the mood options",
    "era": "Decade like 1990s",
    "content_rating": "Rating like R or TV-MA",
    "tags": ["tag1", "tag2", ...],
    "notes": "Any interesting trivia or context" or null
}"""


async def call_llm(model: str, title: str, is_tv: bool, year: int | None) -> dict:
    """Call OpenRouter with a specific model."""
    api_key = os.environ.get("LLM_API_KEY")
    media_type = "TV episode" if is_tv else "movie"
    year_hint = f" ({year})" if year else ""
    user_prompt = f"Provide metadata for this {media_type}: {title}{year_hint}"

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/grobertson/kryten-playlist",
                "X-Title": "kryten-playlist",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 500,
            },
        )
        data = resp.json()

    if "error" in data:
        return {"error": data["error"]}

    content = data["choices"][0]["message"]["content"]

    # Debug output for troubleshooting
    if not content or content.strip() == "":
        return {"error": "Empty response from model"}

    # Parse JSON
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        content = content.split("```")[1].split("```")[0]

    try:
        return json.loads(content.strip())
    except json.JSONDecodeError as e:
        # Return first 200 chars of content for debugging
        preview = content[:200].replace('\n', ' ')
        return {"error": f"{e} - Response preview: {preview}"}


def format_result(model_name: str, data: dict) -> str:
    """Format result for display."""
    if "error" in data:
        return f"  ❌ {model_name}: {data['error']}"

    lines = [
        f"  📌 {model_name}",
        f"     Genre: {data.get('genre', '?')} | Mood: {data.get('mood', '?')} | Era: {data.get('era', '?')} | Rating: {data.get('content_rating', '?')}",
        f"     Synopsis: {data.get('synopsis', 'N/A')}",
        f"     Tags: {', '.join(data.get('tags', []))}",
    ]
    if data.get("director"):
        lines.append(f"     Director: {data['director']}")
    if data.get("cast_list"):
        lines.append(f"     Cast: {', '.join(data['cast_list'][:4])}")
    if data.get("notes"):
        lines.append(f"     Notes: {data['notes'][:100]}")
    return "\n".join(lines)


async def compare_models(titles: list[tuple[str, bool, int | None]]):
    """Compare multiple LLM models on the same titles."""
    models = [
        ("mistralai/devstral-2512:free", "Devstral (Free)"),
        ("nvidia/nemotron-nano-9b-v2", "Nemotron Nano 9B"),
        ("openai/gpt-oss-120b", "GPT-OSS 120B"),
    ]

    for title, is_tv, year in titles:
        media_type = "TV" if is_tv else "Movie"
        print(f"\n{'='*70}")
        print(f"🎬 {title} ({media_type}, {year or 'Unknown year'})")
        print("=" * 70)

        for model_id, model_name in models:
            print(f"\n  ⏳ Calling {model_name}...")
            try:
                result = await call_llm(model_id, title, is_tv, year)
                print(format_result(model_name, result))
            except Exception as e:
                print(f"  ❌ {model_name}: {e}")

        print()


async def main():
    # Specific interesting titles to compare
    test_items = [
        ("Virtuosity (1995)", False, 1995),
        ("Ash vs Evil Dead - S03E10 - The Mettle of Man", True, None),
        ("Rounders (1998)", False, 1998),
    ]

    print("\n🔬 Model Comparison: Devstral vs Nemotron vs GPT-OSS")
    print("=" * 70)

    await compare_models(test_items)


if __name__ == "__main__":
    asyncio.run(main())
