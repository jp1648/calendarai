"""Tests for web search and extraction tools (Tavily)."""

from unittest.mock import MagicMock, patch

import pytest

from app.agents.tools.web_tools import web_search, web_extract, _get_client


class FakeRunContext:
    """Minimal RunContext stand-in for tool tests."""

    def __init__(self):
        self.deps = MagicMock()


@pytest.fixture
def ctx():
    return FakeRunContext()


@pytest.fixture(autouse=True)
def _reset_client():
    """Reset the module-level client between tests."""
    import app.agents.tools.web_tools as mod
    old = mod._client
    mod._client = None
    yield
    mod._client = old


class TestGetClient:
    def test_raises_without_api_key(self):
        with patch("app.agents.tools.web_tools.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(tavily_api_key="")
            with pytest.raises(RuntimeError, match="TAVILY_API_KEY"):
                _get_client()

    def test_creates_client_with_key(self):
        with patch("app.agents.tools.web_tools.get_settings") as mock_settings, \
             patch("app.agents.tools.web_tools.TavilyClient") as MockClient:
            mock_settings.return_value = MagicMock(tavily_api_key="test-key")
            client = _get_client()
            MockClient.assert_called_once_with(api_key="test-key")
            assert client is MockClient.return_value

    def test_caches_client(self):
        with patch("app.agents.tools.web_tools.get_settings") as mock_settings, \
             patch("app.agents.tools.web_tools.TavilyClient") as MockClient:
            mock_settings.return_value = MagicMock(tavily_api_key="test-key")
            c1 = _get_client()
            c2 = _get_client()
            assert c1 is c2
            MockClient.assert_called_once()


class TestWebSearch:
    @pytest.mark.asyncio
    async def test_basic_search(self, ctx):
        fake_response = {
            "answer": "The best pizza is at Joe's.",
            "query": "best pizza",
            "results": [
                {"title": "Joe's Pizza", "url": "https://joes.com", "content": "Great pizza"},
                {"title": "Pizza Hut", "url": "https://pizzahut.com", "content": "Chain pizza"},
            ],
        }
        with patch("app.agents.tools.web_tools._get_client") as mock_gc:
            mock_gc.return_value.search.return_value = fake_response
            result = await web_search(ctx, query="best pizza")

        assert result["answer"] == "The best pizza is at Joe's."
        assert result["query"] == "best pizza"
        assert len(result["results"]) == 2
        assert result["results"][0]["title"] == "Joe's Pizza"

    @pytest.mark.asyncio
    async def test_max_results_capped_at_20(self, ctx):
        with patch("app.agents.tools.web_tools._get_client") as mock_gc:
            mock_gc.return_value.search.return_value = {"results": [], "query": "q"}
            await web_search(ctx, query="q", max_results=50)

            call_kwargs = mock_gc.return_value.search.call_args[1]
            assert call_kwargs["max_results"] == 20

    @pytest.mark.asyncio
    async def test_optional_params_forwarded(self, ctx):
        with patch("app.agents.tools.web_tools._get_client") as mock_gc:
            mock_gc.return_value.search.return_value = {"results": [], "query": "q"}
            await web_search(
                ctx,
                query="q",
                time_range="week",
                include_domains=["example.com"],
                exclude_domains=["spam.com"],
            )

            call_kwargs = mock_gc.return_value.search.call_args[1]
            assert call_kwargs["time_range"] == "week"
            assert call_kwargs["include_domains"] == ["example.com"]
            assert call_kwargs["exclude_domains"] == ["spam.com"]

    @pytest.mark.asyncio
    async def test_none_optionals_not_forwarded(self, ctx):
        with patch("app.agents.tools.web_tools._get_client") as mock_gc:
            mock_gc.return_value.search.return_value = {"results": [], "query": "q"}
            await web_search(ctx, query="q")

            call_kwargs = mock_gc.return_value.search.call_args[1]
            assert "time_range" not in call_kwargs
            assert "include_domains" not in call_kwargs
            assert "exclude_domains" not in call_kwargs

    @pytest.mark.asyncio
    async def test_missing_fields_default_to_empty(self, ctx):
        fake_response = {
            "results": [{"url": "https://example.com"}],
        }
        with patch("app.agents.tools.web_tools._get_client") as mock_gc:
            mock_gc.return_value.search.return_value = fake_response
            result = await web_search(ctx, query="test")

        assert result["results"][0]["title"] == ""
        assert result["results"][0]["content"] == ""
        assert result["answer"] is None

    @pytest.mark.asyncio
    async def test_search_depth_forwarded(self, ctx):
        with patch("app.agents.tools.web_tools._get_client") as mock_gc:
            mock_gc.return_value.search.return_value = {"results": [], "query": "q"}
            await web_search(ctx, query="q", search_depth="advanced")

            call_kwargs = mock_gc.return_value.search.call_args[1]
            assert call_kwargs["search_depth"] == "advanced"


class TestWebExtract:
    @pytest.mark.asyncio
    async def test_basic_extract(self, ctx):
        fake_response = {
            "results": [
                {"url": "https://example.com", "raw_content": "Full page text here."},
            ],
        }
        with patch("app.agents.tools.web_tools._get_client") as mock_gc:
            mock_gc.return_value.extract.return_value = fake_response
            result = await web_extract(ctx, urls=["https://example.com"])

        assert len(result) == 1
        assert result[0]["url"] == "https://example.com"
        assert result[0]["content"] == "Full page text here."

    @pytest.mark.asyncio
    async def test_content_capped_at_5000(self, ctx):
        long_content = "x" * 10000
        fake_response = {
            "results": [{"url": "https://example.com", "raw_content": long_content}],
        }
        with patch("app.agents.tools.web_tools._get_client") as mock_gc:
            mock_gc.return_value.extract.return_value = fake_response
            result = await web_extract(ctx, urls=["https://example.com"])

        assert len(result[0]["content"]) == 5000

    @pytest.mark.asyncio
    async def test_urls_capped_at_20(self, ctx):
        urls = [f"https://example.com/{i}" for i in range(30)]
        with patch("app.agents.tools.web_tools._get_client") as mock_gc:
            mock_gc.return_value.extract.return_value = {"results": []}
            await web_extract(ctx, urls=urls)

            call_kwargs = mock_gc.return_value.extract.call_args[1]
            assert len(call_kwargs["urls"]) == 20

    @pytest.mark.asyncio
    async def test_empty_results(self, ctx):
        with patch("app.agents.tools.web_tools._get_client") as mock_gc:
            mock_gc.return_value.extract.return_value = {"results": []}
            result = await web_extract(ctx, urls=["https://example.com"])

        assert result == []

    @pytest.mark.asyncio
    async def test_missing_raw_content(self, ctx):
        fake_response = {
            "results": [{"url": "https://example.com"}],
        }
        with patch("app.agents.tools.web_tools._get_client") as mock_gc:
            mock_gc.return_value.extract.return_value = fake_response
            result = await web_extract(ctx, urls=["https://example.com"])

        assert result[0]["content"] == ""
