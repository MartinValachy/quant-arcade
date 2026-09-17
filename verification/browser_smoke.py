"""Launch every registered game once in Chromium and verify the play surface."""

from __future__ import annotations

from playwright.sync_api import sync_playwright


URL = "http://127.0.0.1:8765/index.html"


def main() -> int:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        seed = browser.new_page()
        seed.goto(URL, wait_until="networkidle")
        seed.wait_for_function("window.QA && Object.keys(window.QA.byId).length === 24")
        names = seed.locator("#gameGrid h3").all_text_contents()
        seed.close()

        failures = []
        for name in names:
            page = browser.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on(
                "console",
                lambda message: errors.append("console:" + message.text)
                if message.type == "error"
                else None,
            )
            page.goto(URL, wait_until="networkidle")
            page.locator("#gameGrid .card", has_text=name).click()
            page.wait_for_function("document.querySelector('#brief').classList.contains('active')")
            page.locator("#variantPick button").first.click()
            page.wait_for_function("document.querySelector('#play').classList.contains('active')")
            stage = page.locator("#stage").inner_text()
            if not stage.strip() or errors:
                failures.append({"game": name, "stage": bool(stage.strip()), "errors": errors})
            page.close()

        browser.close()

    if failures:
        raise AssertionError(failures)
    print(f"BROWSER_SMOKE_PASSED games={len(names)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
