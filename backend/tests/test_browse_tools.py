"""Tests for web browsing tools (Browserbase + Playwright)."""

from unittest.mock import MagicMock, patch

import pytest

from app.agents.tools.browse_tools import browse_page, _get_client, _browse


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
    import app.agents.tools.browse_tools as mod
    old = mod._client
    mod._client = None
    yield
    mod._client = old


class TestGetClient:
    def test_raises_without_api_key(self):
        with patch("app.agents.tools.browse_tools.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(browserbase_api_key="")
            with pytest.raises(RuntimeError, match="BROWSERBASE_API_KEY"):
                _get_client()

    def test_creates_client_with_key(self):
        with patch("app.agents.tools.browse_tools.get_settings") as mock_settings, \
             patch("app.agents.tools.browse_tools.Browserbase") as MockBB:
            mock_settings.return_value = MagicMock(browserbase_api_key="bb-key")
            client = _get_client()
            MockBB.assert_called_once_with(api_key="bb-key")
            assert client is MockBB.return_value

    def test_caches_client(self):
        with patch("app.agents.tools.browse_tools.get_settings") as mock_settings, \
             patch("app.agents.tools.browse_tools.Browserbase") as MockBB:
            mock_settings.return_value = MagicMock(browserbase_api_key="bb-key")
            c1 = _get_client()
            c2 = _get_client()
            assert c1 is c2
            MockBB.assert_called_once()


class TestBrowse:
    def _mock_playwright(self):
        """Build a mock Playwright context manager chain."""
        mock_page = MagicMock()
        mock_page.title.return_value = "Example Page"
        mock_page.url = "https://example.com/final"
        mock_page.evaluate.return_value = "Main content here."

        mock_context = MagicMock()
        mock_context.pages = [mock_page]

        mock_browser = MagicMock()
        mock_browser.contexts = [mock_context]

        mock_chromium = MagicMock()
        mock_chromium.connect_over_cdp.return_value = mock_browser

        mock_pw = MagicMock()
        mock_pw.chromium = mock_chromium

        # sync_playwright() returns a context manager
        mock_pw_cm = MagicMock()
        mock_pw_cm.__enter__ = MagicMock(return_value=mock_pw)
        mock_pw_cm.__exit__ = MagicMock(return_value=False)

        return mock_pw_cm, mock_page, mock_browser

    def test_browse_returns_content(self):
        mock_pw_cm, mock_page, mock_browser = self._mock_playwright()

        with patch("app.agents.tools.browse_tools._get_client") as mock_gc, \
             patch("app.agents.tools.browse_tools.get_settings") as mock_settings, \
             patch("app.agents.tools.browse_tools.sync_playwright", return_value=mock_pw_cm):
            mock_gc.return_value.sessions.create.return_value = MagicMock(
                id="sess-1", connect_url="ws://fake"
            )
            mock_settings.return_value = MagicMock(browserbase_project_id="proj-1")

            result = _browse("https://example.com")

        assert result["url"] == "https://example.com/final"
        assert result["title"] == "Example Page"
        assert result["content"] == "Main content here."

    def test_browse_caps_content_at_8000(self):
        mock_pw_cm, mock_page, mock_browser = self._mock_playwright()
        mock_page.evaluate.return_value = "x" * 10000

        with patch("app.agents.tools.browse_tools._get_client") as mock_gc, \
             patch("app.agents.tools.browse_tools.get_settings") as mock_settings, \
             patch("app.agents.tools.browse_tools.sync_playwright", return_value=mock_pw_cm):
            mock_gc.return_value.sessions.create.return_value = MagicMock(
                id="sess-1", connect_url="ws://fake"
            )
            mock_settings.return_value = MagicMock(browserbase_project_id="proj-1")

            result = _browse("https://example.com")

        assert len(result["content"]) == 8000

    def test_browse_passes_wait_ms(self):
        mock_pw_cm, mock_page, mock_browser = self._mock_playwright()

        with patch("app.agents.tools.browse_tools._get_client") as mock_gc, \
             patch("app.agents.tools.browse_tools.get_settings") as mock_settings, \
             patch("app.agents.tools.browse_tools.sync_playwright", return_value=mock_pw_cm):
            mock_gc.return_value.sessions.create.return_value = MagicMock(
                id="sess-1", connect_url="ws://fake"
            )
            mock_settings.return_value = MagicMock(browserbase_project_id="proj-1")

            _browse("https://example.com", wait_ms=5000)

        mock_page.wait_for_timeout.assert_called_once_with(5000)

    def test_browse_closes_browser(self):
        mock_pw_cm, mock_page, mock_browser = self._mock_playwright()

        with patch("app.agents.tools.browse_tools._get_client") as mock_gc, \
             patch("app.agents.tools.browse_tools.get_settings") as mock_settings, \
             patch("app.agents.tools.browse_tools.sync_playwright", return_value=mock_pw_cm):
            mock_gc.return_value.sessions.create.return_value = MagicMock(
                id="sess-1", connect_url="ws://fake"
            )
            mock_settings.return_value = MagicMock(browserbase_project_id="proj-1")

            _browse("https://example.com")

        mock_page.close.assert_called_once()
        mock_browser.close.assert_called_once()


class TestBrowsePage:
    @pytest.mark.asyncio
    async def test_browse_page_delegates_to_browse(self, ctx):
        with patch("app.agents.tools.browse_tools._browse") as mock_browse:
            mock_browse.return_value = {"url": "u", "title": "t", "content": "c"}
            result = await browse_page(ctx, url="https://example.com", wait_ms=2000)

        mock_browse.assert_called_once_with("https://example.com", 2000)
        assert result == {"url": "u", "title": "t", "content": "c"}
