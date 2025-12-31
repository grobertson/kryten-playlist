"""Tests for title sanitization and parsing."""

from __future__ import annotations

from kryten_playlist.catalog.title_sanitizer import parse_title, sanitize_title


class TestMovieTitles:
    """Tests for movie title parsing."""

    def test_simple_movie_with_year(self) -> None:
        result = parse_title("Movie.Name.2020.1080p.BluRay.x264.mkv")
        assert result.sanitized == "Movie Name (2020)"
        assert result.title_base == "Movie Name"
        assert result.year == 2020
        assert result.is_tv is False

    def test_movie_with_spaces(self) -> None:
        result = parse_title("The Movie Name 2019 720p WEB-DL.mp4")
        assert result.sanitized == "The Movie Name (2019)"
        assert result.year == 2019

    def test_movie_brackets_year(self) -> None:
        result = parse_title("Movie.Name.[2018].BDRip.x265.mkv")
        assert result.sanitized == "Movie Name (2018)"
        assert result.year == 2018

    def test_movie_no_year(self) -> None:
        result = parse_title("Some.Movie.720p.HDTV.mkv")
        assert result.sanitized == "Some Movie"
        assert result.year is None

    def test_movie_with_parentheses_year(self) -> None:
        result = parse_title("Movie Name (2021) 1080p.mkv")
        assert result.sanitized == "Movie Name (2021)"
        assert result.year == 2021

    def test_movie_extended_cut(self) -> None:
        result = parse_title("Movie.Name.2020.Extended.Cut.1080p.BluRay.mkv")
        assert "Movie Name" in result.sanitized
        assert result.year == 2020

    def test_movie_yify_release(self) -> None:
        result = parse_title("Movie.Name.2019.1080p.BluRay.x264.YIFY.mkv")
        assert result.sanitized == "Movie Name (2019)"

    def test_movie_multi_word(self) -> None:
        result = parse_title("The.Lord.of.the.Rings.2001.Extended.1080p.mkv")
        assert result.sanitized == "The Lord of the Rings (2001)"


class TestTVTitles:
    """Tests for TV show title parsing."""

    def test_simple_episode(self) -> None:
        result = parse_title("Show.Name.S01E04.Episode.Title.720p.HDTV.mp4")
        assert result.sanitized == "Show Name - S01E04 - Episode Title"
        assert result.title_base == "Show Name"
        assert result.season == 1
        assert result.episode == 4
        assert result.episode_title == "Episode Title"
        assert result.is_tv is True

    def test_episode_no_title(self) -> None:
        result = parse_title("Show.Name.S02E10.720p.HDTV.mkv")
        assert result.sanitized == "Show Name - S02E10"
        assert result.season == 2
        assert result.episode == 10
        assert result.episode_title is None

    def test_episode_lowercase(self) -> None:
        result = parse_title("show.name.s03e05.title.here.hdtv.mp4")
        assert result.season == 3
        assert result.episode == 5
        assert result.is_tv is True

    def test_episode_alt_format(self) -> None:
        result = parse_title("Show Name 1x05 Episode Title.avi")
        assert result.season == 1
        assert result.episode == 5
        assert result.is_tv is True

    def test_episode_double_digit_season(self) -> None:
        result = parse_title("Long.Running.Show.S12E03.Episode.720p.mp4")
        assert result.season == 12
        assert result.episode == 3

    def test_episode_with_year_in_show_name(self) -> None:
        # Some shows have years in their name (e.g., "Doctor Who 2005")
        result = parse_title("Doctor.Who.2005.S01E01.Rose.720p.mkv")
        assert result.is_tv is True
        assert result.season == 1
        assert result.episode == 1


class TestEncodingRemoval:
    """Tests for encoding/quality marker removal."""

    def test_removes_resolution(self) -> None:
        for res in ["720p", "1080p", "480p", "2160p", "4K"]:
            result = parse_title(f"Movie.Name.2020.{res}.mkv")
            assert res.lower() not in result.sanitized.lower()

    def test_removes_codec(self) -> None:
        for codec in ["x264", "x265", "h264", "h.265", "HEVC", "XviD"]:
            result = parse_title(f"Movie.Name.2020.{codec}.mkv")
            assert codec.lower() not in result.sanitized.lower()

    def test_removes_source(self) -> None:
        for source in ["BluRay", "BDRip", "DVDRip", "HDTV", "WEBRip", "WEB-DL"]:
            result = parse_title(f"Movie.Name.2020.{source}.mkv")
            assert source.lower() not in result.sanitized.lower()

    def test_removes_audio(self) -> None:
        for audio in ["AAC", "AC3", "DTS", "5.1", "7.1"]:
            result = parse_title(f"Movie.Name.2020.{audio}.mkv")
            assert audio not in result.sanitized

    def test_removes_release_group(self) -> None:
        for group in ["YIFY", "YTS", "RARBG", "ETTV", "LOL"]:
            result = parse_title(f"Movie.Name.2020.1080p.{group}.mkv")
            assert group not in result.sanitized


class TestEdgeCases:
    """Tests for edge cases and unusual inputs."""

    def test_preserves_raw(self) -> None:
        raw = "Some.Weird.Title.2020.mkv"
        result = parse_title(raw)
        assert result.raw == raw

    def test_empty_becomes_empty(self) -> None:
        result = parse_title("")
        assert result.sanitized == ""

    def test_just_extension(self) -> None:
        result = parse_title("file.mkv")
        assert result.sanitized == "file"

    def test_underscores_converted(self) -> None:
        result = parse_title("Movie_Name_2020.mkv")
        assert result.sanitized == "Movie Name (2020)"

    def test_mixed_separators(self) -> None:
        result = parse_title("Movie.Name_Here 2020.mkv")
        assert "Movie" in result.sanitized
        assert "Name" in result.sanitized

    def test_sanitize_convenience_function(self) -> None:
        assert sanitize_title("Movie.2020.1080p.mkv") == "Movie (2020)"


class TestToDict:
    """Test serialization."""

    def test_movie_to_dict(self) -> None:
        result = parse_title("Movie.2020.mkv")
        d = result.to_dict()
        assert d["raw"] == "Movie.2020.mkv"
        assert d["sanitized"] == "Movie (2020)"
        assert d["year"] == 2020
        assert d["is_tv"] is False

    def test_tv_to_dict(self) -> None:
        result = parse_title("Show.S01E01.Pilot.mkv")
        d = result.to_dict()
        assert d["season"] == 1
        assert d["episode"] == 1
        assert d["episode_title"] == "Pilot"
        assert d["is_tv"] is True
