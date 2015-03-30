class CreatePastes < ActiveRecord::Migration
  def change
    create_table :pastes do |t|
      t.text :data
    end
  end
end
