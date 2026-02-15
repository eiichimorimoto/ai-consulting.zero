#!/usr/bin/env python3
"""
Dify AI Consulting 自動テストスクリプト
======================================
使い方:
  1. .env に DIFY_API_URL と DIFY_API_KEY を設定
  2. pip install requests python-dotenv
  3. python dify_auto_test.py

オプション:
  --csv <path>    テストシナリオCSVのパス (デフォルト: test_scenarios.csv)
  --timeout <sec> APIタイムアウト秒数 (デフォルト: 120)
  --delay <sec>   リクエスト間隔秒数 (デフォルト: 2)
"""

import csv
import os
import time
import argparse
import sys
from datetime import datetime

try:
    import requests
except ImportError:
    print("Error: requests ライブラリが必要です")
    print("  pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("Error: python-dotenv ライブラリが必要です")
    print("  pip install python-dotenv")
    sys.exit(1)

# .env ファイルを読み込み
load_dotenv()

DIFY_API_URL = os.getenv("DIFY_API_URL", "")
DIFY_API_KEY = os.getenv("DIFY_API_KEY", "")

# Dify Start ノードの入力変数名（この17個だけをinputsとして送る）
INPUT_VARIABLE_NAMES = [
    "company_name", "industry", "employee_count", "business_description",
    "website", "user_name", "user_department", "user_position",
    "postal_code", "prefecture", "city", "address",
    "selected_category", "selected_subcategory",
    "consulting_step_number", "consulting_step_title", "consulting_step_goal",
]


def send_chat_message(inputs, query, user="test-user", timeout=120):
    """Dify chat-messages APIを呼び出す（blocking モード）"""
    url = f"{DIFY_API_URL}/chat-messages"
    headers = {
        "Authorization": f"Bearer {DIFY_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": inputs,
        "query": query,
        "response_mode": "blocking",
        "conversation_id": "",
        "user": user,
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
        resp.raise_for_status()
        return {"success": True, "data": resp.json()}
    except requests.exceptions.Timeout:
        return {"success": False, "error": "タイムアウト"}
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "接続エラー - DIFY_API_URL を確認してください"}
    except requests.exceptions.HTTPError as e:
        body = e.response.text[:200] if e.response else ""
        return {"success": False, "error": f"HTTP {e.response.status_code}: {body}"}
    except Exception as e:
        return {"success": False, "error": str(e)[:200]}


def build_inputs(scenario):
    """CSVの行からDify Start変数用のinputs dictを構成"""
    inputs = {}
    for key in INPUT_VARIABLE_NAMES:
        # CSVカラム名とDify変数名のマッピング
        if key == "selected_category":
            inputs[key] = scenario.get("category", "")
        elif key == "selected_subcategory":
            inputs[key] = scenario.get("subcategory", "")
        else:
            inputs[key] = scenario.get(key, "")
    return inputs


def run_tests(csv_path, timeout=120, delay=2.0):
    """テストシナリオCSVを読み込んで全テストを実行"""

    with open(csv_path, "r", encoding="utf-8-sig") as f:
        scenarios = list(csv.DictReader(f))

    print("=" * 70)
    print("  Dify AI Consulting 自動テスト")
    print(f"  API URL:    {DIFY_API_URL}")
    print(f"  シナリオ数: {len(scenarios)}")
    print(f"  開始時刻:   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    results = []

    for i, s in enumerate(scenarios, 1):
        test_id = s["test_id"]
        category = s["category"]
        expected_qc2 = s["expected_qc2"]
        query = s["query"]

        print(f"\n[{i}/{len(scenarios)}] {test_id}: {category} -> {expected_qc2}")
        print(f"  質問: {query[:60]}...")

        inputs = build_inputs(s)

        start_time = time.time()
        result = send_chat_message(inputs, query, user=f"test-{test_id}", timeout=timeout)
        elapsed = time.time() - start_time

        if result["success"]:
            answer = result["data"].get("answer", "")
            answer_preview = answer[:150].replace("\n", " ")
            status = "OK"
            error_msg = ""
            print(f"  OK ({elapsed:.1f}秒)")
            print(f"  回答: {answer_preview}...")
        else:
            answer_preview = ""
            status = "FAIL"
            error_msg = result["error"]
            print(f"  FAIL: {error_msg}")

        results.append({
            "test_id": test_id,
            "category": category,
            "expected_qc2": expected_qc2,
            "status": status,
            "elapsed_sec": f"{elapsed:.1f}",
            "answer_preview": answer_preview,
            "error": error_msg,
        })

        if i < len(scenarios):
            time.sleep(delay)

    # === 結果サマリー ===
    print("\n" + "=" * 70)
    print("  テスト結果サマリー")
    print("=" * 70)

    ok_count = sum(1 for r in results if r["status"] == "OK")
    fail_count = sum(1 for r in results if r["status"] == "FAIL")
    total = len(results)

    print(f"  合計: {total}  成功: {ok_count}  失敗: {fail_count}")
    print(f"  成功率: {ok_count / total * 100:.0f}%")

    if fail_count > 0:
        print("\n  --- 失敗したテスト ---")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  {r['test_id']}: {r['error']}")

    # 結果CSV出力
    result_csv = csv_path.replace(".csv", "_results.csv")
    with open(result_csv, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    print(f"\n  結果CSV: {result_csv}")
    print("=" * 70)

    return fail_count == 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Dify AI Consulting 自動テスト")
    parser.add_argument("--csv", default="test_scenarios.csv", help="テストシナリオCSVパス")
    parser.add_argument("--timeout", type=int, default=120, help="APIタイムアウト(秒)")
    parser.add_argument("--delay", type=float, default=2.0, help="リクエスト間隔(秒)")
    args = parser.parse_args()

    # .env チェック
    if not DIFY_API_URL:
        print("エラー: .env に DIFY_API_URL が設定されていません")
        print("  例: DIFY_API_URL=http://localhost/v1")
        sys.exit(1)
    if not DIFY_API_KEY:
        print("エラー: .env に DIFY_API_KEY が設定されていません")
        print("  例: DIFY_API_KEY=app-xxxxxxxxxx")
        sys.exit(1)

    print(f".env 読み込み完了: URL={DIFY_API_URL}")

    success = run_tests(args.csv, args.timeout, args.delay)
    sys.exit(0 if success else 1)
